"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DinoMark } from "@/components/DinoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { addGlossaryWord, lookupWord } from "@/lib/dictionary";
import {
  displayTimeMs,
  effectiveSpeed,
  estimateRemainingMs,
  formatDuration,
  splitAtOrp,
  tokenize,
} from "@/lib/rsvp";
import { getBook, getLastBookId, loadSettings, saveSettings, setLastBookId, updateBookProgress } from "@/lib/storage";
import type { Book, FontSize, ReaderSettings, ReadingMode } from "@/lib/types";

function OrpWord({ word }: { word: string }) {
  const parts = splitAtOrp(word || " ");
  return (
    <span>
      {parts.before}<span className="orp">{parts.pivot}</span>{parts.after}
    </span>
  );
}

export default function ReadingPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<ReaderSettings>(() => loadSettings());
  const [playing, setPlaying] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionMs, setSessionMs] = useState(0);
  const [lookupDefinition, setLookupDefinition] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const id = getLastBookId();
    if (!id) return;
    getBook(id).then((loaded) => {
      if (!loaded) return;
      const tokenized = tokenize(loaded.textContent);
      setBook(loaded);
      setWords(tokenized);
      setIndex(Math.min(loaded.currentWord, tokenized.length - 1));
      setPlaying(false);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!playing || words.length === 0) return;
    const currentWord = words[index] ?? "";
    const speed = effectiveSpeed(settings.speed, words, index, settings.autoAdjust);
    const timeout = window.setTimeout(() => {
      setIndex((current) => {
        const step = settings.readingMode === "2" ? 2 : 1;
        const next = Math.min(words.length, current + step);
        if (next >= words.length) setPlaying(false);
        return next;
      });
    }, displayTimeMs(currentWord, speed, settings.readingMode));
    return () => window.clearTimeout(timeout);
  }, [playing, words, index, settings]);

  useEffect(() => {
    if (!book) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      updateBookProgress(book.id, index).catch(() => undefined);
    }, 300);
  }, [book, index]);

  useEffect(() => {
    if (!playing) return;
    if (!sessionStartedAt) setSessionStartedAt(Date.now());
    const timer = window.setInterval(() => setSessionMs((Date.now() - (sessionStartedAt ?? Date.now()))), 1000);
    return () => window.clearInterval(timer);
  }, [playing, sessionStartedAt]);

  const visibleWords = useMemo(() => {
    if (settings.readingMode === "2") return [words[index] ?? "", words[index + 1] ?? ""];
    return [words[index] ?? ""];
  }, [words, index, settings.readingMode]);

  const percent = words.length ? Math.min(100, Math.round((index / words.length) * 100)) : 0;
  const currentEffectiveSpeed = effectiveSpeed(settings.speed, words, index, settings.autoAdjust);
  const remaining = estimateRemainingMs(words, index, currentEffectiveSpeed);

  function updateSetting<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function skip(amount: number) {
    setIndex((current) => Math.max(0, Math.min(words.length - 1, current + amount)));
  }

  async function lookUpCurrentWord() {
    const currentWord = words[index];
    if (!currentWord) return;
    setLookupStatus(`Looking up ${currentWord}...`);
    setLookupDefinition("");
    try {
      const definition = await lookupWord(currentWord);
      await addGlossaryWord(currentWord, definition);
      setLookupDefinition(definition);
      setLookupStatus(currentWord);
    } catch (err) {
      setLookupStatus(err instanceof Error ? err.message : "Lookup failed.");
    }
  }

  if (!book) {
    return (
      <main className="reader-page">
        <header className="reader-bar">
          <Link href="/" className="brand"><DinoMark /><span>SpeedReader</span></Link>
        </header>
        <section className="reader-main">
          <div className="panel">
            <p className="eyebrow">No active book</p>
            <h1>Import something first.</h1>
            <p>Your last active book could not be found in local storage.</p>
            <Link href="/" className="button">Back to Library</Link>
          </div>
        </section>
        <div />
      </main>
    );
  }

  return (
    <main className="reader-page">
      <header className="reader-bar">
        <Link href="/" className="brand"><DinoMark /><span>{book.title}</span></Link>
        <div className="control-cluster">
          <ThemeToggle theme={settings.theme} onChange={(theme) => updateSetting("theme", theme)} />
          <span className="reader-stat">{settings.speed} wpm</span>
          {settings.autoAdjust && <span className="muted small">effective {currentEffectiveSpeed} wpm</span>}
          <span className="muted small">{index.toLocaleString()} / {words.length.toLocaleString()} words</span>
          <span className="muted small">{formatDuration(remaining)} left</span>
        </div>
      </header>

      <section className="reader-main" onClick={() => setPlaying((current) => !current)}>
        <div className="reader-word-wrap">
          {settings.readingMode === "2" ? (
            <div className={`reader-word ${settings.fontSize}-font two-words`}>
              <span className="left"><OrpWord word={visibleWords[0]} /></span>
              <span className="right"><OrpWord word={visibleWords[1]} /></span>
            </div>
          ) : (
            <div className={`reader-word ${settings.fontSize}-font`}><OrpWord word={visibleWords[0]} /></div>
          )}
        </div>
      </section>

      {lookupStatus && (
        <aside className="lookup-card reader-panel">
          <p className="eyebrow">Dictionary</p>
          <h3>{lookupStatus}</h3>
          <p>{lookupDefinition || "Saved lookup status."}</p>
          <button className="ghost" onClick={() => { setLookupStatus(""); setLookupDefinition(""); }}>Close</button>
        </aside>
      )}

      <footer className="reader-bar reader-bottom">
        <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
        <div className="control-cluster">
          <button onClick={() => setPlaying((current) => !current)}>{playing ? "Pause" : "Start"}</button>
          <button className="ghost" onClick={() => skip(-settings.skipWords)}>-{settings.skipWords}</button>
          <button className="ghost" onClick={() => skip(settings.skipWords)}>+{settings.skipWords}</button>
          <button className="ghost" onClick={() => setIndex(0)}>Reset</button>
          <button className="secondary" onClick={lookUpCurrentWord}>Lookup Word</button>
        </div>
        <div className="settings-grid">
          <label>
            Speed
            <input className="slider" type="range" min="100" max="1000" step="10" value={settings.speed} onChange={(event) => updateSetting("speed", Number(event.target.value))} />
          </label>
          <label>
            Preset
            <select value={settings.speed} onChange={(event) => updateSetting("speed", Number(event.target.value))}>
              {[150, 250, 300, 400, 500, 600].map((speed) => <option value={speed} key={speed}>{speed} wpm</option>)}
            </select>
          </label>
          <label>
            Mode
            <select value={settings.readingMode} onChange={(event) => updateSetting("readingMode", event.target.value as ReadingMode)}>
              <option value="1">1 word</option>
              <option value="2">2 words</option>
            </select>
          </label>
          <label>
            Font
            <select value={settings.fontSize} onChange={(event) => updateSetting("fontSize", event.target.value as FontSize)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xl">XL</option>
            </select>
          </label>
          <label>
            Jump words
            <input type="number" min="1" max="500" value={settings.skipWords} onChange={(event) => updateSetting("skipWords", Number(event.target.value))} />
          </label>
          <label>
            Position
            <input type="range" min="0" max={Math.max(0, words.length - 1)} value={index} onChange={(event) => setIndex(Number(event.target.value))} />
          </label>
          <label>
            Auto-adjust
            <select value={settings.autoAdjust ? "yes" : "no"} onChange={(event) => updateSetting("autoAdjust", event.target.value === "yes")}>
              <option value="no">Off</option>
              <option value="yes">On</option>
            </select>
          </label>
          <label>
            Session
            <input value={formatDuration(sessionMs)} readOnly />
          </label>
        </div>
      </footer>
    </main>
  );
}
