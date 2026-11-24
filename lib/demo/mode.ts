// Demo mode lets visitors (e.g. recruiters) try the app without an account.
// A cookie marks the browser as "in demo" so middleware lets /dashboard through,
// and lib/supabase.ts routes every query to the localStorage demo client instead.

export const DEMO_COOKIE = "workdesk-demo"

export function isDemoMode(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split("; ").some(c => c === `${DEMO_COOKIE}=1`)
}

export function setDemoMode(on: boolean) {
  if (typeof document === "undefined") return
  document.cookie = on
    ? `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    : `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`
}
