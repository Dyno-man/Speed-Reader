import type { BookFigure, BookSection, SourceType } from "./types";
import { normalizeText, tokenize } from "./rsvp";

const FIGURE_IMAGE_LIMIT_BYTES = 25 * 1024 * 1024;

type EpubZip = {
  file(path: string): {
    async(type: "text"): Promise<string>;
    async(type: "uint8array"): Promise<Uint8Array>;
  } | null;
};

export async function extractFileText(file: File): Promise<{ text: string; title: string; source: SourceType; sections?: BookSection[]; figures?: BookFigure[] }> {
  const name = file.name.replace(/\.[^.]+$/, "");
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt")) return { text: normalizeText(await file.text()), title: name, source: "txt" };
  if (lower.endsWith(".pdf")) return { text: await extractPdfText(file), title: name, source: "pdf" };
  if (lower.endsWith(".epub")) return { ...(await extractEpubText(file)), title: name, source: "epub" };
  throw new Error("Unsupported file. Use .txt, .pdf, or .epub.");
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(pageText);
  }
  return normalizeText(pages.join("\n"));
}

async function extractEpubText(file: File) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const containerXml = await zip.file("META-INF/container.xml")?.async("text");
  if (!containerXml) throw new Error("Invalid EPUB: missing container.xml.");

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, "application/xml");
  const rootfilePath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
  if (!rootfilePath) throw new Error("Invalid EPUB: missing package file.");

  const packageXml = await zip.file(rootfilePath)?.async("text");
  if (!packageXml) throw new Error("Invalid EPUB: package file not found.");

  const packageDoc = parser.parseFromString(packageXml, "application/xml");
  const basePath = rootfilePath.includes("/") ? rootfilePath.slice(0, rootfilePath.lastIndexOf("/") + 1) : "";
  const manifest = new Map<string, string>();
  const manifestTypes = new Map<string, string>();
  packageDoc.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    const mediaType = item.getAttribute("media-type") ?? "";
    if (id && href) {
      const resolvedPath = normalizeZipPath(basePath + href);
      manifest.set(id, resolvedPath);
      if (mediaType) manifestTypes.set(resolvedPath, mediaType);
    }
  });
  const tocLabels = await extractTocLabels(zip, parser, packageDoc, manifest, basePath);

  const chapters: string[] = [];
  const sections: BookSection[] = [];
  const figures: BookFigure[] = [];
  let figureImageBytes = 0;
  let wordOffset = 0;
  const spineItems = Array.from(packageDoc.querySelectorAll("spine itemref"));
  for (const [chapterIndex, item] of spineItems.entries()) {
    const idref = item.getAttribute("idref");
    const path = idref ? manifest.get(idref) : undefined;
    const content = path ? await zip.file(path)?.async("text") : undefined;
    if (!path || !content) continue;
    const doc = parser.parseFromString(content, "text/html");
    const body = doc.body;
    const chapterText = normalizeText(body?.textContent ?? "");
    const chapterWords = tokenize(chapterText).length;
    if (!chapterWords) continue;

    const sectionBaseTitle = tocLabels.get(stripFragment(path)) || normalizeText(body?.querySelector("h1, h2, h3")?.textContent ?? "") || `Section ${chapterIndex + 1}`;
    sections.push({ title: `${sections.length + 1}. ${sectionBaseTitle} (${chapterWords.toLocaleString()} words)`, startWord: wordOffset, endWord: wordOffset + chapterWords });

    if (body) {
      const figureElements = Array.from(body.querySelectorAll("figure, img")).filter((element) => element.tagName.toLowerCase() === "figure" || !element.closest("figure"));
      for (const element of figureElements) {
        const text = figureText(element);
        const image = element.tagName.toLowerCase() === "img" ? element : element.querySelector("img");
        const imageAlt = normalizeText(image?.getAttribute("alt") ?? image?.getAttribute("title") ?? "");
        const imageData = image ? await figureImageData(zip, image, path, manifestTypes, FIGURE_IMAGE_LIMIT_BYTES - figureImageBytes) : undefined;
        if (imageData) figureImageBytes += imageData.bytes;
        const displayText = text || imageAlt || (imageData ? "No figure description found." : "");
        if (!displayText) continue;
        figures.push({
          wordIndex: wordOffset + wordsBeforeElement(doc, body, element),
          label: `Figure ${figures.length + 1}`,
          text: displayText,
          imageSrc: imageData?.src,
          imageAlt,
        });
      }
    }

    chapters.push(chapterText);
    wordOffset += chapterWords;
  }
  return { text: normalizeText(chapters.join("\n")), sections, figures };
}

async function extractTocLabels(zip: EpubZip, parser: DOMParser, packageDoc: Document, manifest: Map<string, string>, basePath: string) {
  const labels = new Map<string, string>();
  const navPath = Array.from(packageDoc.querySelectorAll("manifest item")).find((item) => (item.getAttribute("properties") ?? "").split(/\s+/).includes("nav"))?.getAttribute("href");
  const ncxId = packageDoc.querySelector("spine")?.getAttribute("toc");
  const ncxPath = ncxId ? manifest.get(ncxId) : undefined;
  const tocPath = navPath ? normalizeZipPath(basePath + navPath) : ncxPath;
  const tocXml = tocPath ? await zip.file(tocPath)?.async("text") : undefined;
  if (!tocXml || !tocPath) return labels;

  const doc = parser.parseFromString(tocXml, "text/html");
  const navLinks = Array.from(doc.querySelectorAll("nav[epub\\:type='toc'] a, nav[type='toc'] a, nav a"));
  if (navLinks.length > 0) {
    for (const link of navLinks) {
      const href = link.getAttribute("href");
      const text = normalizeText(link.textContent ?? "");
      if (href && text) labels.set(resolveRelativePath(tocPath, href).path, text);
    }
    return labels;
  }

  const ncxDoc = parser.parseFromString(tocXml, "application/xml");
  ncxDoc.querySelectorAll("navPoint").forEach((point) => {
    const href = point.querySelector("content")?.getAttribute("src");
    const text = normalizeText(point.querySelector("navLabel text")?.textContent ?? "");
    if (href && text) labels.set(resolveRelativePath(tocPath, href).path, text);
  });
  return labels;
}

function figureText(element: Element) {
  const caption = normalizeText(element.querySelector("figcaption")?.textContent ?? "");
  if (caption) return caption;

  const image = element.tagName.toLowerCase() === "img" ? element : element.querySelector("img");
  const alt = normalizeText(image?.getAttribute("alt") ?? image?.getAttribute("title") ?? "");
  if (alt) return alt;

  const nearby = element.closest("p")?.textContent || element.previousElementSibling?.textContent || element.nextElementSibling?.textContent || "";
  return normalizeText(nearby);
}

async function figureImageData(zip: EpubZip, image: Element, chapterPath: string, manifestTypes: Map<string, string>, remainingBytes: number) {
  const src = image.getAttribute("src") || image.getAttribute("href") || image.getAttribute("xlink:href");
  if (!src || src.startsWith("data:") || remainingBytes <= 0) return undefined;
  const imagePath = resolveRelativePath(chapterPath, src).path;
  const mime = manifestTypes.get(imagePath) || mimeFromPath(imagePath);
  if (!mime) return undefined;
  const file = zip.file(imagePath);
  if (!file) return undefined;
  const bytes = await file.async("uint8array");
  if (bytes.byteLength > remainingBytes) return undefined;
  return { src: `data:${mime};base64,${bytesToBase64(bytes)}`, bytes: bytes.byteLength };
}

function resolveRelativePath(fromPath: string, href: string) {
  const [rawPath, fragment = ""] = href.split("#");
  const baseParts = fromPath.split("/");
  baseParts.pop();
  const parts = (rawPath.startsWith("/") ? rawPath.slice(1) : `${baseParts.join("/")}/${rawPath}`).split("/");
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") normalized.pop();
    else normalized.push(decodeURIComponent(part));
  }
  return { path: normalized.join("/"), fragment };
}

function normalizeZipPath(path: string) {
  return resolveRelativePath("", path).path;
}

function stripFragment(path: string) {
  return path.split("#")[0];
}

function mimeFromPath(path: string) {
  const extension = path.toLowerCase().split(".").pop();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  return "";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function wordsBeforeElement(doc: Document, body: HTMLElement, element: Element) {
  try {
    const range = doc.createRange();
    range.setStart(body, 0);
    range.setEndBefore(element);
    return tokenize(range.toString()).length;
  } catch {
    return 0;
  }
}

export function fileSizeWarning(file: File) {
  const mb = file.size / 1024 / 1024;
  if (mb >= 100) return `Large file: ${mb.toFixed(1)}MB. Browser storage or memory may refuse import.`;
  if (mb >= 50) return `Large file: ${mb.toFixed(1)}MB. Import may take a while.`;
  return "";
}
