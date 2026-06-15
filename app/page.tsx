"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DinoMark } from "@/components/DinoMark";
import { extractFileText, fileSizeWarning } from "@/lib/importers";
import { formatDuration, tokenize } from "@/lib/rsvp";
import { clearLastBookId, deleteBook, getBooks, loadSettings, saveBook, saveSettings, setLastBookId, updateBookProgress } from "@/lib/storage";
import type { Book, SourceType, ThemeMode } from "@/lib/types";

function makeBook(title: string, textContent: string, source: SourceType): Book {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: title.trim() || "Untitled text",
    source,
    textContent,
    totalWords: tokenize(textContent).length,
    currentWord: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [renamingId, setRenamingId] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [settings, setSettings] = useState(() => loadSettings());

  async function refreshBooks() {
    setBooks(await getBooks());
  }

  useEffect(() => {
    refreshBooks().catch((err) => setError(err instanceof Error ? err.message : "Failed to load library."));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery = !q || book.title.toLowerCase().includes(q);
      const matchesSource = sourceFilter === "all" || book.source === sourceFilter;
      return matchesQuery && matchesSource;
    });
  }, [books, query, sourceFilter]);

  async function importText() {
    setError("");
    const words = tokenize(pasteText);
    if (words.length === 0) {
      setError("Paste text with at least one word.");
      return;
    }
    const book = makeBook(title || "Pasted text", pasteText, "paste");
    await saveBook(book);
    setLastBookId(book.id);
    setPasteText("");
    setTitle("");
    setStatus(`Imported ${book.title}.`);
    await refreshBooks();
  }

  async function importFile(file: File) {
    setError("");
    setStatus(fileSizeWarning(file) || `Importing ${file.name}...`);
    try {
      const extracted = await extractFileText(file);
      if (tokenize(extracted.text).length === 0) throw new Error("No readable text found. Scanned PDFs need OCR, not supported yet.");
      const book = makeBook(extracted.title, extracted.text, extracted.source);
      await saveBook(book);
      setLastBookId(book.id);
      setStatus(`Imported ${book.title}.`);
      await refreshBooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  async function removeBook(book: Book) {
    if (!confirm(`Delete "${book.title}" from local library?`)) return;
    await deleteBook(book.id);
    clearLastBookId(book.id);
    await refreshBooks();
  }

  async function renameBook(book: Book) {
    const nextTitle = renameTitle.trim();
    if (!nextTitle) return;
    await saveBook({ ...book, title: nextTitle, updatedAt: new Date().toISOString() });
    setRenamingId("");
    setRenameTitle("");
    await refreshBooks();
  }

  async function restartBook(book: Book) {
    await updateBookProgress(book.id, 0);
    await refreshBooks();
  }

  function openBook(id: string) {
    setLastBookId(id);
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <Link href="/" className="brand">
            <DinoMark />
            <span>SpeedReader</span>
          </Link>
          <div className="control-cluster">
            <label className="theme-toggle">
              Theme
              <select value={settings.theme} onChange={(event) => setSettings((current) => ({ ...current, theme: event.target.value as ThemeMode }))}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <Link href="/reading" className="button" onClick={() => books[0] && openBook(books[0].id)}>
              Resume Reading
            </Link>
          </div>
        </header>

        <section className="hero">
          <div>
            <p className="eyebrow">Local-first RSVP reader</p>
            <h1 className="hero-title">
              Read faster.
              <br />
              <span className="hero-accent">Keep everything on your device.</span>
            </h1>
            <p className="hero-sub">
              Paste text, drop files, and read with a clean ORP-focused speed reader. No accounts, no server library, no cloud sync.
            </p>
            <div className="hero-actions">
              <a className="button" href="#import">Import Text</a>
              <a className="button secondary" href="#library">Open Library</a>
            </div>
          </div>
          <div className="hero-card">
            <div className="sample-reader">
              <div>
                <div className="sample-word">fo<span className="orp">c</span>us</div>
                <div className="sample-meta"><span>300 wpm</span><span>ORP highlighted</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid">
          <div className="panel" id="import">
            <div>
              <p className="eyebrow">Import</p>
              <h2>Add reading material</h2>
              <p>Paste text or drop `.txt`, `.pdf`, or `.epub` files. Big files stay local but may hit browser limits.</p>
            </div>
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title" />
            </label>
            <label>
              Paste text
              <textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste article, notes, or book excerpt..." />
            </label>
            <button onClick={importText}>Save Pasted Text</button>
            <div
              className={`dropzone ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) importFile(file);
              }}
            >
              <p><strong>Drop file here</strong></p>
              <p className="small">Supports `.txt`, text-based `.pdf`, and `.epub`.</p>
              <input type="file" accept=".txt,.pdf,.epub" onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])} />
            </div>
            {status && <p className="success">{status}</p>}
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel" id="library">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Local books</h2>
            </div>
            <div className="library-tools">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles" />
              <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                <option value="all">All sources</option>
                <option value="paste">Paste</option>
                <option value="txt">TXT</option>
                <option value="pdf">PDF</option>
                <option value="epub">EPUB</option>
              </select>
            </div>
            <div className="book-list">
              {filteredBooks.length === 0 && <p>No local books yet.</p>}
              {filteredBooks.map((book) => {
                const percent = book.totalWords ? Math.round((book.currentWord / book.totalWords) * 100) : 0;
                return (
                  <article className="book-card" key={book.id}>
                    <header>
                      <div>
                        {renamingId === book.id ? (
                          <div className="inline-edit">
                            <input value={renameTitle} onChange={(event) => setRenameTitle(event.target.value)} />
                            <button onClick={() => renameBook(book)}>Save</button>
                          </div>
                        ) : (
                          <h3>{book.title}</h3>
                        )}
                        <p className="small">{book.source.toUpperCase()} · {book.totalWords.toLocaleString()} words · {formatDuration((book.totalWords / 300) * 60000)} at 300 wpm</p>
                      </div>
                      <strong>{percent}%</strong>
                    </header>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
                    <div className="button-row">
                      <Link href="/reading" className="button" onClick={() => openBook(book.id)}>Resume</Link>
                      <button className="ghost" onClick={() => { setRenamingId(book.id); setRenameTitle(book.title); }}>Rename</button>
                      <button className="ghost" onClick={() => restartBook(book)}>Restart</button>
                      <button className="danger-button" onClick={() => removeBook(book)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
