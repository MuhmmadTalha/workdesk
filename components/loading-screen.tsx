"use client"

import { BrandMark } from "@/components/brand-mark"

export function LoadingScreen({ label = "Loading your workspace…" }: { label?: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-5">
        <BrandMark showWordmark={false} className="animate-pulse [animation-duration:1.6s]" />
        <div className="h-0.5 w-28 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loading-bar_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
