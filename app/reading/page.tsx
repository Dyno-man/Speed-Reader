"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DinoMark } from "@/components/DinoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { addGlossaryWord, lookupWord } from "@/lib/dictionary";
import {
  displayTimeMs,
  defaultSettings,
  effectiveSpeed,
  estimateRemainingMs,
  formatDuration,
  splitAtOrp,
  tokenize,
} from "@/lib/rsvp";
import { getBook, getLastBookId, loadSettings, saveSettings, setLastBookId, updateBookProgress } from "@/lib/storage";
import type { Book, BookFigure, FontSize, ReaderSettings, ReadingMode } from "@/lib/types";

function OrpWord({ word }: { word: string }) {
  const parts = splitAtOrp(word || " ");
  return (
    <span>
      {parts.before}<span className="orp">{parts.pivot}</span>{parts.after}
    </span>
  );
}

const speedPresets = [150, 250, 300, 400, 500, 600];

export default function ReadingPage() {
  const [book, setBook] = useState<Book | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [settings, setSettings] = useState<ReaderSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionMs, setSessionMs] = useState(0);
  const [lookupDefinition, setLookupDefinition] = useState("");
  const [lookupStatus, setLookupStatus] = useState("");
  const [activeFigure, setActiveFigure] = useState<BookFigure | null>(null);
  const [fullscreenFigure, setFullscreenFigure] = useState<BookFigure | null>(null);
  const [acknowledgedFigures, setAcknowledgedFigures] = useState<Set<string>>(new Set());
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    document.documentElement.dataset.theme = loadedSettings.theme;
    setSettingsLoaded(true);

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
    if (!settingsLoaded) return;
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings, settingsLoaded]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!fullscreenFigure) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreenFigure(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [fullscreenFigure]);

  useEffect(() => {
    if (!playing || words.length === 0) return;
    const step = settings.readingMode === "2" ? 2 : 1;
    if (settings.showFigureNotes && book?.figures?.length) {
      const nextFigure = book.figures.find((figure) => {
        const key = figureKey(figure);
        return figure.wordIndex >= index && figure.wordIndex < index + step && !acknowledgedFigures.has(key);
      });
      if (nextFigure) {
        setActiveFigure(nextFigure);
        setPlaying(false);
        setIndex(nextFigure.wordIndex);
        return;
      }
    }
    const currentWord = words[index] ?? "";
    const speed = effectiveSpeed(settings.speed, words, index, settings.autoAdjust);
    const timeout = window.setTimeout(() => {
      setIndex((current) => {
        const next = Math.min(words.length, current + step);
        if (next >= words.length) setPlaying(false);
        return next;
      });
    }, displayTimeMs(currentWord, speed, settings.readingMode));
    return () => window.clearTimeout(timeout);
  }, [playing, words, index, settings, book, acknowledgedFigures]);

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
  const isCustomSpeed = !speedPresets.includes(settings.speed);

  function updateSetting<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function skip(amount: number) {
    setIndex((current) => Math.max(0, Math.min(words.length - 1, current + amount)));
  }

  function closeFigureNote() {
    if (!activeFigure) return;
    setAcknowledgedFigures((current) => new Set(current).add(figureKey(activeFigure)));
    setFullscreenFigure(null);
    setActiveFigure(null);
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

      {activeFigure && (
        <aside className="figure-card reader-panel">
          <p className="eyebrow">{activeFigure.label}</p>
          <h3>Figure note</h3>
          {activeFigure.imageSrc && (
            <img className="figure-image" src={activeFigure.imageSrc} alt={activeFigure.imageAlt || activeFigure.text} />
          )}
          <p>{activeFigure.text}</p>
          {activeFigure.imageAlt && activeFigure.imageAlt !== activeFigure.text && <p className="small muted"><strong>Alt text:</strong> {activeFigure.imageAlt}</p>}
          <div className="button-row">
            {activeFigure.imageSrc && <button className="ghost" onClick={() => setFullscreenFigure(activeFigure)}>Fullscreen</button>}
            <button onClick={closeFigureNote}>Close</button>
            <button className="secondary" onClick={() => { closeFigureNote(); setPlaying(true); }}>Close + Resume</button>
          </div>
        </aside>
      )}

      {fullscreenFigure?.imageSrc && (
        <div className="figure-fullscreen" role="dialog" aria-modal="true" aria-label="Figure fullscreen" onClick={() => setFullscreenFigure(null)}>
          <div className="figure-fullscreen-panel" onClick={(event) => event.stopPropagation()}>
            <button className="figure-fullscreen-close ghost" onClick={() => setFullscreenFigure(null)}>Close</button>
            <img className="figure-fullscreen-image" src={fullscreenFigure.imageSrc} alt={fullscreenFigure.imageAlt || fullscreenFigure.text} />
            <div className="figure-fullscreen-copy">
              <p className="eyebrow">{fullscreenFigure.label}</p>
              <p>{fullscreenFigure.text}</p>
              {fullscreenFigure.imageAlt && fullscreenFigure.imageAlt !== fullscreenFigure.text && <p className="small muted"><strong>Alt text:</strong> {fullscreenFigure.imageAlt}</p>}
            </div>
          </div>
        </div>
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
              {isCustomSpeed && <option value={settings.speed}>Custom: {settings.speed} wpm</option>}
              {speedPresets.map((speed) => <option value={speed} key={speed}>{speed} wpm</option>)}
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
            Figure notes
            <select value={settings.showFigureNotes ? "yes" : "no"} onChange={(event) => { updateSetting("showFigureNotes", event.target.value === "yes"); if (event.target.value === "no") setActiveFigure(null); }}>
              <option value="yes">On</option>
              <option value="no">Off</option>
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

function figureKey(figure: BookFigure) {
  return `${figure.wordIndex}:${figure.label}:${figure.text}`;
}
