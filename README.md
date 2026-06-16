# SpeedReader

Local-first RSVP speed reader for reading pasted text, TXT files, PDFs, and EPUBs in the browser.

Live site: [speed-reader.dinosessentials.xyz](https://speed-reader.dinosessentials.xyz)

## Features

- Paste text or import `.txt`, text-based `.pdf`, and `.epub` files
- Local library stored in the browser with IndexedDB
- No accounts and no backend storage
- 1-word and 2-word RSVP reading modes
- ORP letter highlighting
- Speed presets and custom WPM control
- Light/dark theme
- Manual dictionary lookup with local cache

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm run build
```
