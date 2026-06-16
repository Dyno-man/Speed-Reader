import type { ReaderSettings } from "./types";

export const defaultSettings: ReaderSettings = {
  speed: 300,
  readingMode: "1",
  fontSize: "medium",
  theme: "light",
  autoAdjust: false,
  skipWords: 25,
  showFigureNotes: true,
};

export function normalizeText(text: string) {
  return text
    .normalize("NFC")
    .replace(/<[^>]*>/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string) {
  const normalized = normalizeText(text);
  return normalized.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*|[^\s]/gu) ?? [];
}

export function getOrpIndex(word: string) {
  const letters = Array.from(word);
  if (letters.length <= 1) return 0;
  if (letters.length <= 5) return Math.min(2, letters.length - 1);
  return Math.floor(letters.length / 2);
}

export function splitAtOrp(word: string) {
  const chars = Array.from(word);
  const orpIndex = getOrpIndex(word);
  return {
    before: chars.slice(0, orpIndex).join(""),
    pivot: chars[orpIndex] ?? "",
    after: chars.slice(orpIndex + 1).join(""),
  };
}

export function calculateComplexity(words: string[], currentIndex: number) {
  const context = words.slice(Math.max(0, currentIndex - 10), currentIndex + 10);
  if (context.length === 0) return 0;
  const alphaWords = context.filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (alphaWords.length === 0) return 0;
  const avgLength = alphaWords.reduce((sum, word) => sum + Array.from(word).length, 0) / alphaWords.length;
  const longRatio = alphaWords.filter((word) => Array.from(word).length > 6).length / alphaWords.length;
  const punctuationRatio = context.filter((word) => /[.,;:!?]/.test(word)).length / context.length;
  return Math.max(0, Math.min(1, avgLength / 10 + longRatio * 0.35 - punctuationRatio * 0.2));
}

export function effectiveSpeed(baseSpeed: number, words: string[], currentIndex: number, autoAdjust: boolean) {
  if (!autoAdjust) return baseSpeed;
  const complexity = calculateComplexity(words, currentIndex);
  const multiplier = 1.15 - complexity * 0.35;
  return Math.max(100, Math.min(1000, Math.round(baseSpeed * multiplier)));
}

export function displayTimeMs(word: string, speed: number, mode: "1" | "2") {
  const baseInterval = 60000 / speed;
  const length = Array.from(word).length;
  let multiplier = 1;
  if (length < 4) multiplier = 0.85;
  if (length > 6) multiplier = 1.15;
  const modeMultiplier = mode === "2" ? 2 / 1.5 : 1;
  return Math.max(50, Math.min(2000, baseInterval * multiplier * modeMultiplier));
}

export function estimateRemainingMs(words: string[], currentWord: number, speed: number) {
  const remaining = Math.max(0, words.length - currentWord);
  return (remaining / Math.max(speed, 1)) * 60000;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
