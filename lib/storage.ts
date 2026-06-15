import type { Book, DefinitionCacheEntry, GlossaryEntry, ReaderSettings } from "./types";
import { defaultSettings } from "./rsvp";

const DB_NAME = "speed-reader-db";
const DB_VERSION = 1;
const SETTINGS_KEY = "speed-reader-settings";
const LAST_BOOK_KEY = "speed-reader-last-book";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("books")) db.createObjectStore("books", { keyPath: "id" });
      if (!db.objectStoreNames.contains("glossary")) db.createObjectStore("glossary", { keyPath: "word" });
      if (!db.objectStoreNames.contains("definitions")) db.createObjectStore("definitions", { keyPath: "word" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = run(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function getBooks(): Promise<Book[]> {
  const books = await tx<Book[]>("books", "readonly", (store) => store.getAll());
  return books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getBook(id: string): Promise<Book | undefined> {
  return tx<Book | undefined>("books", "readonly", (store) => store.get(id));
}

export function saveBook(book: Book) {
  return tx<IDBValidKey>("books", "readwrite", (store) => store.put(book));
}

export function deleteBook(id: string) {
  return tx<undefined>("books", "readwrite", (store) => store.delete(id));
}

export async function updateBookProgress(id: string, currentWord: number) {
  const book = await getBook(id);
  if (!book) return;
  await saveBook({ ...book, currentWord, updatedAt: new Date().toISOString() });
}

export function getGlossary(): Promise<GlossaryEntry[]> {
  return tx<GlossaryEntry[]>("glossary", "readonly", (store) => store.getAll());
}

export function saveGlossaryEntry(entry: GlossaryEntry) {
  return tx<IDBValidKey>("glossary", "readwrite", (store) => store.put(entry));
}

export function getDefinition(word: string): Promise<DefinitionCacheEntry | undefined> {
  return tx<DefinitionCacheEntry | undefined>("definitions", "readonly", (store) => store.get(word.toLowerCase()));
}

export function saveDefinition(entry: DefinitionCacheEntry) {
  return tx<IDBValidKey>("definitions", "readwrite", (store) => store.put({ ...entry, word: entry.word.toLowerCase() }));
}

export function loadSettings(): ReaderSettings {
  if (typeof window === "undefined") return defaultSettings;
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: ReaderSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getLastBookId() {
  return localStorage.getItem(LAST_BOOK_KEY);
}

export function setLastBookId(id: string) {
  localStorage.setItem(LAST_BOOK_KEY, id);
}

export function clearLastBookId(id: string) {
  if (localStorage.getItem(LAST_BOOK_KEY) === id) localStorage.removeItem(LAST_BOOK_KEY);
}
