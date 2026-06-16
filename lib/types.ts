export type SourceType = "paste" | "txt" | "pdf" | "epub";
export type ReadingMode = "1" | "2";
export type FontSize = "small" | "medium" | "large" | "xl";
export type ThemeMode = "light" | "dark";

export interface BookSection {
  title: string;
  startWord: number;
  endWord: number;
}

export interface BookFigure {
  wordIndex: number;
  label: string;
  text: string;
  imageSrc?: string;
  imageAlt?: string;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  source: SourceType;
  textContent: string;
  totalWords: number;
  currentWord: number;
  sections?: BookSection[];
  figures?: BookFigure[];
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
  showFigureNotes: boolean;
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
