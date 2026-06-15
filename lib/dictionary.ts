import { getDefinition, saveDefinition, saveGlossaryEntry } from "./storage";

export async function lookupWord(rawWord: string) {
  const word = rawWord.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!word) throw new Error("No lookup word available.");
  const cached = await getDefinition(word);
  if (cached) return cached.definition || "No definition found.";

  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!response.ok) {
    await saveDefinition({ word, fetchedAt: new Date().toISOString() });
    return "No definition found.";
  }
  const data = await response.json();
  const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? "No definition found.";
  await saveDefinition({ word, definition, fetchedAt: new Date().toISOString() });
  return definition;
}

export async function addGlossaryWord(rawWord: string, definition?: string) {
  const word = rawWord.toLowerCase().replace(/[^a-z'-]/g, "");
  if (!word) return;
  const now = new Date().toISOString();
  await saveGlossaryEntry({ word, definition, addedAt: now, lastSeenAt: now, timesSeen: 1 });
}
