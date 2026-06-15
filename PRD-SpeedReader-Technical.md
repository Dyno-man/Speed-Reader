# Technical Architecture — SpeedReader

## 1. Summary

Technical specification for building the SpeedReader RSVP speed reading application, covering system architecture, data models, API design, and implementation details.

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Any Browser (Chrome, Firefox, Safari, Edge)      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                         Next.js (React) — Client-Side Only              ││
│  │                                                                          ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   ││
│  │  │ Import UI   │  │  Reading    │  │  Settings   │  │  Progress   │   ││
│  │  │             │  │  Screen     │  │  Panel      │  │  Panel      │   ││
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   ││
│  │         │                │                │                │          ││
│  │         └────────────────┼────────────────┼────────────────┘          ││
│  │                          │                                               ││
│  │              ┌───────────┴───────────────┐                               ││
│  │              │   Client-Side Engine      │                               ││
│  │              │  ┌─────────────┐          │                               ││
│  │              │  │ RSVP Engine │          │                               ││
│  │              │  └─────────────┘          │                               ││
│  │              │  ┌─────────────┐          │                               ││
│  │              │  │ Text Proc.  │          │                               ││
│  │              │  │ Pipeline    │          │                               ││
│  │              │  └─────────────┘          │                               ││
│  │              │  ┌─────────────┐          │                               ││
│  │              │  │ Vocab       │          │                               ││
│  │              │  │ Highlight   │          │                               ││
│  │              │  └─────────────┘          │                               ││
│  │              │  ┌─────────────┐          │                               ││
│  │              │  │ Auto-       │          │                               ││
│  │              │  │ Adjust      │          │                               ││
│  │              │  └─────────────┘          │                               ││
│  │              └───────────────────────────┘                               ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                    Local Storage (Browser)                              ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    ││
│  │  │ Progress    │  │  Settings   │  │  Glossary   │                    ││
│  │  │ (where      │  │  (ORP,     │  │  (unknown   │                    ││
│  │  │  you left   │  │  theme,    │  │  words)     │                    ││
│  │  │  off)       │  │  speed)    │  │             │                    ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │                     External APIs (Client-Side)                         ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  │  Free Dictionary API (for vocab highlighting)                      │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │
│  └──────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**No backend, no server, no database, no accounts.** Everything runs in the browser.

## 3. Core Technology Stack

### Frontend
- **Framework:** Next.js (React) — client-side only, no SSR needed
- **State Management:** Zustand (lightweight, no server needed)
- **Styling:** Tailwind CSS — dark mode support, responsive design
- **EPUB extraction:** epub.js (browser version, client-side)
- **PDF extraction:** pdf.js (browser version, Mozilla's library, client-side)
- **Article extraction:** Readability.js (browser version, client-side)
- **Text processing:** Custom Unicode-aware word tokenizer (browser)

### External APIs
- **Dictionary:** Free Dictionary API (https://dictionaryapi.dev/) — client-side, no API key needed
  - GET `/api/v2/definitions?word={word}` — returns definitions for unknown words
  - Rate limit: ~60 requests/minute, sufficient for vocab highlighting

### Storage
- **Browser localStorage** — progress, settings, glossary saved locally
- **IndexedDB** — for storing extracted text of books (browser can store ~50MB+ per site)

### No Backend Required
- No server, no database, no accounts, no cloud storage
- All text extraction happens client-side
- All progress tracking local to the user's browser

## 4. Data Models

### LocalStorage Models

#### Progress
```typescript
interface Progress {
  bookTitle: string;
  author: string;
  currentWord: number;
  totalWords: number;
  speed: number;
  lastReadAt: string; // ISO date
}
```

#### Settings
```typescript
interface Settings {
  ORPPosition: 'left' | 'center' | 'right' | 'custom';
  customORPPosition?: number;
  fontSize: 'S' | 'M' | 'L' | 'XL';
  theme: 'light' | 'dark' | 'custom';
  readingMode: '1' | '2'; // 1-word or 2-word
  speedIncrement: number;
  autoAdjustSpeed: boolean;
  ORPCustomPerWordLength: boolean;
}
```

#### Glossary (Unknown Words)
```typescript
interface Glossary {
  word: string;
  definition?: string; // from Free Dictionary API
  addedAt: string; // ISO date
  lastSeenAt: string; // ISO date
  timesSeen: number;
}
```

#### Book
```typescript
interface Book {
  title: string;
  author?: string;
  source: 'epub' | 'pdf' | 'txt' | 'url';
  sourceUrl?: string; // for URL-sourced books
  totalWords: number;
  totalPages?: number; // for PDF/EPUB
  currentWord: number;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
  textContent: string; // extracted text, stored in IndexedDB
}
```

## 5. API Design

### Authentication
```
POST   /api/auth/register          - Register with email/password
POST   /api/auth/login             - Login with email/password
POST   /api/auth/logout            - Logout
POST   /api/auth/forgot-password   - Send password reset email
POST   /api/auth/reset-password    - Reset password with token
GET    /api/auth/session           - Get current session (JWT)
```

### Books
```
GET    /api/books                  - List user's books
POST   /api/books                  - Create a new book (text/URL/file)
GET    /api/books/:id              - Get book details
DELETE /api/books/:id              - Delete a book
PUT    /api/books/:id/progress     - Update reading progress
POST   /api/books/:id/import       - Import text/URL (polling endpoint)
```

### Reading Sessions
```
POST   /api/sessions               - Create a new reading session
GET    /api/sessions/:id           - Get session details
PUT    /api/sessions/:id/pause     - Pause session
PUT    /api/sessions/:id/resume    - Resume session
PUT    /api/sessions/:id/stop      - Stop session (save progress)
GET    /api/sessions               - List user's sessions (with pagination)
```

### Comprehension
```
GET    /api/comprehension/question - Generate a comprehension question
POST   /api/comprehension/answer   - Submit answer
GET    /api/comprehension/stats    - Get comprehension stats
```

### Analytics
```
GET    /api/analytics/summary      - Get reading summary (speed, duration, etc.)
GET    /api/analytics/progress     - Get speed progression chart data
GET    /api/analytics/weekly       - Get weekly reading report
```

### User Settings
```
GET    /api/settings               - Get user settings
PUT    /api/settings               - Update user settings
```

## 6. RSVP Engine (Core Algorithm)

### 6.1 ORP Calculation

The Optimal Recognition Point is the "sweet spot" of a word — the character where your eye's foveal vision processes the most information. For English, it's typically the 2nd-3rd character for short words and the middle for long words.

```
ORP position = floor(wordLength / 2) for words > 5 chars
ORP position = min(2, wordLength - 1) for words ≤ 5 chars
ORP position = custom (user preference)
```

**Examples:**
- "the" → ORP at position 1 ("t**h**e")
- "recognition" → ORP at position 5 ("recog**n**ition")
- "a" → ORP at position 0 ("**a**")

### 6.2 Word Display Timing

```
Base interval = 60,000 / wpm (milliseconds per word)

Dynamic adjustment:
- Short words (< 4 chars): interval * 0.85
- Medium words (4-6 chars): interval * 1.0
- Long words (> 6 chars): interval * 1.15

Minimum display time: 50ms (to prevent flicker)
Maximum display time: 2,000ms (for very slow speeds)
```

### 6.3 1-Word vs 2-Word Mode

**1-Word Mode (Standard RSVP):**
- One word displayed at a time at the center of the screen
- ORP highlighted within the word

**2-Word Mode (Toggle):**
- Two words displayed simultaneously — left word in red, right word in green
- Reduces eye movement between words
- Better for higher speeds (500+ wpm)
- ORP highlighted within each word independently
- Display interval = (60,000 / wpm) * 2 / 1.5
  - /1.5 accounts for the fact that 2 words are processed as one visual unit

### 6.4 Auto-Adjust Speed

```typescript
class AutoAdjustSpeed {
  // Analyzes text complexity and adjusts speed accordingly
  calculateSpeed(baseSpeed: number, words: string[], currentIndex: number): number {
    // Look at surrounding text (±10 words)
    const contextWindow = words.slice(Math.max(0, currentIndex - 10), currentIndex + 10);
    
    // Calculate complexity score (0-1):
    // - Average word length (> 5 chars = complex)
    // - Sentence length (> 25 words = complex)
    // - Punctuation density (, . ! ? — more = simpler)
    const avgWordLength = contextWindow.reduce((sum, w) => sum + w.length, 0) / contextWindow.length;
    const complexRatio = contextWindow.filter(w => w.length > 5).length / contextWindow.length;
    
    // Complexity score (0 = easy, 1 = hard)
    const complexity = Math.min(1, (avgWordLength / 8) + (complexRatio * 0.5));
    
    // Speed adjustment: -30% to +30% from base speed
    const adjustment = 1 - (complexity * 0.6); // 0.4 to 1.0
    return Math.round(baseSpeed * adjustment);
  }
}
```

### 6.5 Pause/Resume Logic

```typescript
class RSVPEngine {
  private interval: number | null = null;
  private currentWordIndex: number = 0;
  private currentSpeed: number = 300;
  private baseSpeed: number = 300;
  private words: string[] = [];
  private isPaused: boolean = false;
  private readingMode: '1' | '2' = '1'; // 1-word or 2-word
  
  start(words: string[], speed: number) {
    this.words = words;
    this.baseSpeed = speed;
    this.currentSpeed = speed;
    this.isPaused = false;
    this.tick();
  }
  
  tick() {
    if (this.isPaused || this.currentWordIndex >= this.words.length) return;
    
    if (this.readingMode === '1') {
      this.renderWord(this.words[this.currentWordIndex]);
      this.currentWordIndex++;
    } else {
      // 2-word mode
      const word1 = this.words[this.currentWordIndex];
      const word2 = this.currentWordIndex + 1 < this.words.length 
        ? this.words[this.currentWordIndex + 1] : '';
      this.renderTwoWords(word1, word2);
      this.currentWordIndex += 2;
    }
    
    // Auto-adjust speed
    this.currentSpeed = this.autoAdjust.calculateSpeed(this.baseSpeed, this.words, this.currentWordIndex);
    
    const displayTime = this.calculateDisplayTime();
    
    this.interval = setTimeout(() => {
      this.tick();
    }, displayTime);
  }
  
  pause() {
    this.isPaused = true;
    if (this.interval) clearTimeout(this.interval);
  }
  
  resume() {
    this.isPaused = false;
    this.tick();
  }
  
  changeSpeed(newSpeed: number) {
    this.baseSpeed = newSpeed;
    this.currentSpeed = newSpeed;
  }
  
  toggleReadingMode() {
    this.readingMode = this.readingMode === '1' ? '2' : '1';
  }
  
  calculateDisplayTime(): number {
    const word = this.readingMode === '1' 
      ? this.words[this.currentWordIndex]
      : (this.words[this.currentWordIndex] || '');
    
    const baseInterval = 60000 / this.currentSpeed;
    const wordLength = word.length;
    
    let multiplier = 1.0;
    if (wordLength < 4) multiplier = 0.85;
    else if (wordLength > 6) multiplier = 1.15;
    
    // 2-word mode adjusts interval
    const modeMultiplier = this.readingMode === '2' ? (2 / 1.5) : 1;
    
    return Math.max(50, Math.min(2000, baseInterval * multiplier * modeMultiplier));
  }
}
```

## 7. Text Processing Pipeline

### 7.1 URL Extraction
```
Input: URL string
Process:
  1. Fetch URL → HTML content (via fetch in browser)
  2. Parse HTML → DOM
  3. Apply Readability.js → extract main content
  4. Extract text → strip HTML tags
  5. Tokenize → split into words array
  6. Calculate total words
Output: { text: string[], totalWords: number, title: string, author: string? }
```

### 7.2 PDF Extraction
```
Input: PDF file
Process:
  1. Read PDF → pdf.js (browser version)
  2. Extract text per page → textContent.items[].str
  3. Join pages → single text string
  4. Tokenize → split into words array
  5. Calculate total words and pages
Output: { text: string[], totalWords: number, totalPages: number }
```

### 7.3 EPUB Extraction
```
Input: EPUB file
Process:
  1. Parse EPUB → epub.js (browser version)
  2. Extract all chapter content
  3. Join content → single text string
  4. Tokenize → split into words array
  5. Calculate total words
Output: { text: string[], totalWords: number, title: string, author: string? }
```

### 7.4 Text Normalization
```
Process:
  1. Unicode NFC normalization (normalize text)
  2. Remove HTML tags
  3. Remove extra whitespace
  4. Handle smart quotes → straight quotes
  5. Split into words (Unicode-aware tokenizer)
  6. Calculate word count
```

### 7.5 Vocab Highlighting
```
Process:
  1. When a word flashes, check if it's in the user's glossary
  2. If not in glossary, call Free Dictionary API:
     GET https://api.dictionaryapi.dev/api/v2/entries/en/{word}
  3. If definition found, highlight word and show definition on tap
  4. If no definition, highlight as unknown word
  5. User can tap to add word to glossary
  6. User can tap to mark word as "known" (skip future lookups)
```

## 8. Client-Side Architecture

### Next.js (Client-Side Only) Structure
```
app/
├── page.tsx                  # Landing / Import screen
├── reading/
│   └── page.tsx              # Core reading screen
├── settings/
│   └── page.tsx              # Settings panel
├── components/
│   ├── ImportUI.tsx          # Drag-and-drop / URL paste import
│   ├── RSVPWord.tsx          # 1-word RSVP display
│   ├── RSVPTwoWords.tsx      # 2-word RSVP display
│   ├── SpeedSlider.tsx       # WPM slider
│   ├── ProgressIndicator.tsx # Progress + chapter navigation
│   ├── VocabHighlight.tsx    # Vocabulary highlighting popup
│   └── SettingsPanel.tsx     # Settings panel
├── hooks/
│   ├── useRSVPEngine.ts      # RSVP engine hook
│   ├── useProgress.ts        # Progress save/load
│   ├── useVocab.ts           # Vocab highlighting
│   └── useAutoAdjust.ts      # Auto-adjust speed
├── lib/
│   ├── rsvp-engine.ts        # RSVP engine core (shared)
│   ├── text-processor.ts     # Text extraction (shared)
│   ├── orp.ts               # ORP calculation (shared)
│   └── vocab-api.ts         # Free Dictionary API client
└── utils/
    ├── constants.ts          # Shared constants
    └── storage.ts            # localStorage/IndexedDB helpers
```

### Shared Core
```
src/
├── core/
│   ├── rsvp-engine.ts       # RSVP engine (shared)
│   ├── text-processor.ts    # Text extraction (shared)
│   └── orp.ts              # ORP calculation (shared)
├── types/
│   └── index.ts            # Shared types
└── utils/
    └── constants.ts        # Shared constants
```

## 11. Security

- **No auth needed** — no accounts, no data on servers
- **File upload:** Max 50MB, validate file type (.pdf, .epub, .txt)
- **CORS:** Restrict to app domains
- **Dictionary API:** Rate limit ~60 req/min on client side, cache responses locally

## 12. Performance

### RSVP Performance
- Word display must be butter-smooth (60fps)
- Use requestAnimationFrame for animations
- Pre-render next word during current word display
- Minimize re-renders: React.memo on RSVPWord component

### Text Processing Performance
- Large texts (100K+ words): process text in chunks, don't load all at once
- PDF/EPUB: lazy page loading
- Memory: process text in chunks, not all at once
- Store extracted text in IndexedDB (browser can store ~50MB+ per site)

### App Performance
- Code splitting: separate reading screen bundle from dashboard
- Tree shaking: exclude unused dependencies
- Offline: cache text locally for reading without internet
- Dictionary API responses cached in IndexedDB to avoid redundant lookups
