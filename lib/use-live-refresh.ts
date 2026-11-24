"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

let channelCounter = 0

/**
 * Re-runs `reload` whenever any of `tables` changes in the database (Supabase Realtime),
 * and when the tab becomes visible again or the browser comes back online — so the
 * page catches up after sleep or a dropped connection.
 *
 * Realtime respects Row Level Security: a user only gets events for rows they can read.
 * Bursts of changes are debounced into a single reload.
 */
export function useLiveRefresh(tables: string[], reload: () => void, enabled = true) {
  // Always call the latest reload without re-subscribing on every render.
  const reloadRef = useRef(reload)
  reloadRef.current = reload
  const key = tables.join(",")

  useEffect(() => {
    if (!enabled || !key) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      timer = setTimeout(() => reloadRef.current(), 300)
    }

    let channel = supabase.channel(`live:${key}:${++channelCounter}`)
    for (const table of key.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, schedule)
    }
    channel.subscribe()

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule()
    }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", schedule)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", schedule)
      supabase.removeChannel(channel)
    }
  }, [key, enabled])
}
