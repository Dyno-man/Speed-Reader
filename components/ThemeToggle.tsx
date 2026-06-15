import type { ThemeMode } from "@/lib/types";

export function ThemeToggle({ theme, onChange }: { theme: ThemeMode; onChange: (theme: ThemeMode) => void }) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button className="theme-button" type="button" aria-label={label} title={label} onClick={() => onChange(nextTheme)}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4V2" />
          <path d="M12 22v-2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
        </svg>
      )}
    </button>
  );
}
