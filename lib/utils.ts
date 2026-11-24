import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Escape a string so it can be used literally inside a RegExp. */
export function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Split `text` around case-insensitive matches of `query`.
 * Returns segments with a `match` flag, so callers can highlight without
 * the stateful `RegExp.test` + global-flag bug.
 */
export function splitForHighlight(text: string, query: string): { text: string; match: boolean }[] {
  const q = query.trim()
  if (!q) return [{ text, match: false }]
  // With a capture group, split() puts the matches at the odd indexes.
  return text
    .split(new RegExp(`(${escapeRegExp(q)})`, "i"))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter(part => part.text !== "")
}

/** Today's date as YYYY-MM-DD in the browser's local time zone (not UTC). */
export function localDateString(date: Date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** The browser's IANA time zone, e.g. "Asia/Karachi". */
export function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}
