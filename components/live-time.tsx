"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

export function LiveTime({ className }: { className?: string }) {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 15_000)
    return () => clearInterval(timer)
  }, [])

  if (!time) return null

  return (
    <div className={cn("items-baseline gap-2 text-sm text-muted-foreground", className)}>
      <span>{time.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
      <span className="font-medium tabular-nums text-foreground">
        {time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  )
}
