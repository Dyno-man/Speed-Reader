# PRD: SpeedReader — RSVP-Based Speed Reading App

## 1. Summary

SpeedReader is a speed reading application that uses Rapid Serial Visual Presentation (RSVP) technology to help people read books and articles significantly faster. Instead of reading words line-by-line with your eyes (which causes regression and subvocalization), SpeedReader flashes words one at a time at a set speed with the Optimal Recognition Point (ORP) highlighted, keeping you focused and eliminating the inner voice.

## 2. Contacts

| Name | Role | Comment |
|------|------|---------|
| Grant | Product Owner / Founder | Driving the product vision |

## 3. Background

### The Problem
Normal reading is limited by two cognitive bottlenecks:

1. **Eye movement (regression)** — Your eyes jump (saccade) across a line, then backtrack (regress) to re-read. This wastes ~50% of reading time.
2. **Subvocalization** — You silently "say" each word in your head as you read it. Your brain's auditory processing is slower (~150 wpm) than your visual processing (~450 wpm). You're reading at the speed of your voice, not your eyes.

### Why Now
- Speed reading apps exist (Spritz, Spreeder, ReadMeNow, ReadSpeed) but they're fragmented across platforms, expensive ($5-20/month), and most have outdated UX/UI
- The RSVP technique has been proven for decades — studies show 50-70% speed improvements at speeds of 300-600 wpm with decent comprehension for familiar topics
- Modern browsers can handle complex client-side text extraction (EPUB, PDF, text) without any server — making a fully local, privacy-first speed reader feasible
- Growing market for productivity and learning tools post-pandemic

### Market Landscape
- **Spritz** — The original. $9.99/month. Web + iOS. Good ORP algorithm. Poor UI.
- **Spreeder** — $4.99/month. Web + iOS. Browser-based. Outdated.
- **ReadMeNow** — Free tier + $5.99/month. Web. Clean UI but limited features.
- **ReadSpeed** — Free. Desktop. Basic.
- **AccelaReader** — Free. Browser extension. No mobile app.
- **ReadMe** — $4.99/month. iOS only.
- **GingerSpeed** — Free. Web.

**Gap**: No modern, cross-platform, beautifully designed speed reader with a free tier that works everywhere.

## 4. Objective

### What's the Objective?
Build a polished, cross-platform speed reading app that makes RSVP-based speed reading accessible, enjoyable, and effective. Help people read 2-3x faster without sacrificing comprehension.

### How Will It Benefit Customers?
- Read books 2-3x faster (300-600 wpm vs. 200-250 wpm normal reading)
- No more regression — the app guides your eyes, you don't search
- No more subvocalization — flash too fast to "say" words internally
- Comprehension stays high because the ORP ensures your eye processes the most important part of each word
- Works on any device, any text — paste a URL, upload a PDF, or open a book

### Key Results (SMART OKRs)

**KR1 — User Acquisition:** Reach 10,000 MAU within 6 months of launch
**KR2 — Engagement:** Average session length of 20+ minutes for 50% of users
**KR3 — Speed Improvement:** 80% of users achieve 300+ wpm within 30 days
**KR4 — Comprehension:** 70% of users report "good" or "excellent" comprehension at 300+ wpm (survey-based)
**KR5 — Retention:** 40% D30 retention rate

### How It Aligns With Vision
Speed reading is a gateway into the broader productivity and self-improvement space. A well-designed speed reader builds trust and habit — users who rely on the tool for daily reading become natural adopters of future features (comprehension tracking, book summaries, spaced repetition, etc.).

### Market Segment(s)

### Primary: Anyone Who Wants to Read Faster
- Anyone who wants to read books faster — no demographic constraints
- People who prefer local-first, privacy-respecting tools (no cloud sync needed)
- **Constraints:** Needs to work in any browser, no installation required

## 6. Value Proposition(s)

### Primary Value Proposition
**Read 2-3x faster without losing comprehension — in any browser, no sign-up, no cloud storage.**

### What Customers Will Gain
- **Speed:** Read books in half the time. A 300-page book takes ~5 hours at 300 wpm vs. ~10 hours at 150 wpm.
- **Focus:** No wandering eyes, no backtracking. The flashing word keeps you locked in.
- **Portability:** Read the same book on phone, tablet, laptop — same speed, same settings.
- **Comprehension:** The ORP highlights the part of each word your eye processes most accurately, so you actually understand more per word.

### Which Pains Will They Avoid?
- The guilt of unread books on your shelf
- Spending hours on content that doesn't need hours
- Falling asleep while reading on your phone
- The frustration of constantly re-reading the same paragraph

### Which Problems Do We Solve Better Than Competitors?
- **Better design** — modern UI, not 2015 aesthetics
- **Cross-platform** — phone AND desktop, not one or the other
- **Better price** — generous free tier, reasonable paid tier
- **Better features** — comprehension quizzes, reading analytics, smart speed adaptation

## 7. Solution

### 7.1 UX / User Flow

**Flow: Reading a Book**
1. Open the website in any browser
2. Drag-and-drop a book file (EPUB, PDF, or text file) onto the page — or paste a URL
3. App extracts text locally (no upload to any server)
4. Choose a reading mode: **1 word at a time** (standard RSVP) or **2 words at a time** (toggle between them)
5. Set a speed (slider: 100-1000 wpm, default 300)
6. Start reading — word(s) flash with ORP highlighted
7. Tap to pause, double-tap to skip ahead, swipe to change speed
8. Save progress locally in browser
9. Open later and resume exactly where left off

**Core Reading Screen:**
- Full-screen, distraction-free
- Word(s) centered on screen in large font
- ORP highlighted in color (e.g., red dot under the pivot point)
- Speed displayed at top (e.g., "300 wpm")
- Progress bar at bottom
- Chapter/page display for navigation
- Minimal controls (tap to pause, long-press for settings)

### 7.2 Key Features

#### MVP Features (Launch)

**F1 — RSVP Word Display**
- **1 word at a time** (standard RSVP, word centered on page)
- **2 words at a time** toggle (left word in red, right word in green — reduces eye movement)
- ORP highlighting (the "sweet spot" of each word — typically the 2nd-3rd character for short words, middle for long words)
- Custom ORP position setting (user can adjust if default feels off)
- Font size control
- Word color / ORP highlight color customization

**F2 — Text Input**
- Drag-and-drop file upload (EPUB, PDF, .txt)
- Paste URL (extracts article text)
- Paste text directly
- Copy-paste from clipboard auto-detect
- All text extraction happens locally in the browser — no server uploads

**F3 — Speed Control**
- **Manual speed:** Slider: 100-1000 wpm (default 300), preset speeds: 150, 250, 300, 400, 500, 600 wpm
- **Auto-adjust speed:** Baseline speed that adapts — goes faster through easy sections (summaries), slower through dense ones, user can override anytime
- Increment: 10 wpm (slider) / 50 wpm (presets)

**F4 — Reading Controls**
- Tap: pause/resume
- Double-tap: skip ahead (N words)
- Swipe left/right: change speed (+/- 50 wpm)
- Long press: jump to specific position

**F5 — Progress Tracking**
- Words read / total words
- Time remaining
- Percentage complete
- Session timer
- Chapter/page navigation panel

**F6 — Vocabulary Highlighting**
- **Auto-detect:** Free Dictionary API integration — highlights unfamiliar words (words not in the dictionary) and shows definition on tap
- **Manual marking:** Tap any word to mark it as "unknown" and get a definition popup
- Save unknown words to a personal glossary for later review

**F7 — Local Progress Save**
- Progress saved in browser localStorage — no account needed
- Resume exactly where you left off when you reopen the same book
- Progress persists across browser sessions

**F8 — Settings**
- Reading mode: 1 word / 2 words (toggle)
- ORP position (left / center / right — or custom)
- Font size (S / M / L / XL)
- Theme (light / dark / custom)
- Speed increment (+/- 10 wpm)
- Auto-adjust speed: on / off

#### Premium Features (Post-MVP)

**F9 — Custom ORP Per Word Length**
- Different ORP position for short words (1-3 chars), medium (4-6), long (7+)

**F10 — Glossary Management**
- Export/import unknown words list
- Spaced repetition for unknown words
- Custom word lists to add to "known" words

**F11 — Reading Analytics**
- Weekly/monthly reading reports
- Speed progression chart
- Books completed tracker
- "Time saved" metric (vs. normal reading)

**F12 — Keyboard Shortcuts**
- Space: pause/resume
- Arrow keys: skip forward/backward
- +/-: change speed
- R: switch 1-word / 2-word mode

**F13 — Dark Mode Customization**
- Custom color themes
- Custom ORP highlight color

### 7.3 Technology

**Frontend:**
- Pure website — works in any browser (Chrome, Firefox, Safari, Edge)
- No app installs, no platform-specific builds
- Framework: Next.js (React) — good for local-first apps
- State management: Zustand (lightweight, no server needed)

**No Backend Required:**
- All text extraction happens client-side in the browser
- EPUB extraction: epub.js (runs in browser)
- PDF extraction: pdf.js (runs in browser, Mozilla's library)
- Text extraction: Readability.js (for URL-based article extraction)
- Progress saved in localStorage — no database needed
- Dictionary integration: Free Dictionary API (client-side, no server)

**Speed Algorithm:**
- RSVP timing: interval = 60,000 / wpm milliseconds
- Dynamic timing: adjust interval based on word length (longer words get slightly longer display time)
- Pause detection: auto-pause on navigation away from page
- Auto-adjust: analyze text complexity (sentence length, word length, punctuation density) to adapt speed

### 7.4 Assumptions

**A1 — RSVP works for most text types** (validated by research, but comprehension varies by text complexity)
**A2 — EPUB/PDF text extraction is reliable** (only text-based PDFs supported — no OCR needed, only text-based PDFs, EPUBs, and txt files)
**A3 — Free Dictionary API is reliable** (client-side, no server needed)
**A4 — Users prefer local-first, no-signup experience** (no account needed, no cloud sync)
**A5 — Auto-adjust speed is useful** (may need user validation on how it should work)

## 8. Release

### Phase 1 — MVP (Weeks 1-8)
- RSVP word display with ORP (1-word mode)
- Text input (drag-and-drop EPUB/PDF/txt, URL paste)
- Speed control (slider + presets)
- Reading controls (tap, double-tap, swipe)
- Progress tracking with chapter/page navigation panel
- Vocabulary highlighting (dictionary + manual)
- Local progress save (localStorage)
- Dark mode
- Website only — works in any browser

### Phase 2 — 2-Word Mode + Auto-Adjust (Weeks 9-16)
- 2-word RSVP mode (toggle between 1-word and 2-word)
- Auto-adjust speed (analyzes text complexity)
- Keyboard shortcuts
- Custom ORP per word length
- Glossary management

### Phase 3 — Polish (Weeks 17-24)
- Custom color themes
- Custom ORP highlight color
- Advanced PDF/EPUB support
- Reading analytics
- Accessibility features (voice over, dyslexia-friendly fonts)
