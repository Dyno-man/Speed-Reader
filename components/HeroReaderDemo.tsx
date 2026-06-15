"use client";

import { useEffect, useMemo, useState } from "react";
import { splitAtOrp } from "@/lib/rsvp";

const sampleWords = ["focus", "chapter", "velocity", "privacy", "steady"];

function DemoWord({ word }: { word: string }) {
  const parts = splitAtOrp(word);
  return (
    <span>
      {parts.before}<span className="orp sample-orp">{parts.pivot}</span>{parts.after}
    </span>
  );
}

export function HeroReaderDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % sampleWords.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  const progress = useMemo(() => ((index + 1) / sampleWords.length) * 100, [index]);

  return (
    <div className="sample-reader" aria-label="Live RSVP reading preview">
      <div className="sample-frame">
        <div className="sample-label-row">
          <span>RSVP specimen</span>
          <span>300 wpm</span>
        </div>
        <div className="sample-word" key={sampleWords[index]}>
          <DemoWord word={sampleWords[index]} />
        </div>
        <div className="sample-progress" aria-hidden="true">
          <div style={{ width: `${progress}%` }} />
        </div>
        <div className="sample-meta">
          <span>ORP locked</span>
          <span>{index + 1}/{sampleWords.length}</span>
        </div>
      </div>
    </div>
  );
}
