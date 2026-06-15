export type SourceType = "paste" | "txt" | "pdf" | "epub";
export type ReadingMode = "1" | "2";
export type FontSize = "small" | "medium" | "large" | "xl";
export type ThemeMode = "light" | "dark";

export interface Book {
  id: string;
  title: string;
  author?: string;
  source: SourceType;
  textContent: string;
  totalWords: number;
  currentWord: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReaderSettings {
  speed: number;
  readingMode: ReadingMode;
  fontSize: FontSize;
  theme: ThemeMode;
  autoAdjust: boolean;
  skipWords: number;
}

export interface GlossaryEntry {
  word: string;
  definition?: string;
  addedAt: string;
  lastSeenAt: string;
  timesSeen: number;
}

export interface DefinitionCacheEntry {
  word: string;
  definition?: string;
  fetchedAt: string;
}
