import type { SourceType } from "./types";
import { normalizeText } from "./rsvp";

export async function extractFileText(file: File): Promise<{ text: string; title: string; source: SourceType }> {
  const name = file.name.replace(/\.[^.]+$/, "");
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".txt")) return { text: normalizeText(await file.text()), title: name, source: "txt" };
  if (lower.endsWith(".pdf")) return { text: await extractPdfText(file), title: name, source: "pdf" };
  if (lower.endsWith(".epub")) return { text: await extractEpubText(file), title: name, source: "epub" };
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
  packageDoc.querySelectorAll("manifest item").forEach((item) => {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (id && href) manifest.set(id, basePath + href);
  });

  const chapters: string[] = [];
  const spineItems = Array.from(packageDoc.querySelectorAll("spine itemref"));
  for (const item of spineItems) {
    const idref = item.getAttribute("idref");
    const path = idref ? manifest.get(idref) : undefined;
    const content = path ? await zip.file(path)?.async("text") : undefined;
    if (!content) continue;
    const doc = parser.parseFromString(content, "text/html");
    chapters.push(doc.body?.textContent ?? "");
  }
  return normalizeText(chapters.join("\n"));
}

export function fileSizeWarning(file: File) {
  const mb = file.size / 1024 / 1024;
  if (mb >= 100) return `Large file: ${mb.toFixed(1)}MB. Browser storage or memory may refuse import.`;
  if (mb >= 50) return `Large file: ${mb.toFixed(1)}MB. Import may take a while.`;
  return "";
}
