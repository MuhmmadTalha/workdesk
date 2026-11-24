"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import { Bell, CalendarCheck, CheckCircle2, ClipboardList, Pencil, Star, X, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link_tab: string | null
  read_at: string | null
  created_at: string
}

const TYPE_ICON: Record<string, { icon: LucideIcon; className: string }> = {
  task_assigned: { icon: ClipboardList, className: "bg-brand-soft text-brand" },
  task_completed: { icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  task_updated: { icon: Pencil, className: "bg-info-soft text-info-soft-foreground" },
  task_cancelled: { icon: XCircle, className: "bg-muted text-muted-foreground" },
  rating_added: { icon: Star, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  attendance_updated: { icon: CalendarCheck, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? "yesterday" : `${days}d ago`
}

export function NotificationBell({ userId, onNavigate }: { userId: string; onNavigate?: (tab: string) => void }) {
  const [items, setItems] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [, forceTick] = useState(0) // re-render so "5m ago" stays current
  const { toast } = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link_tab, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
    if (data) setItems(data)
  }, [])

  useEffect(() => {
    if (!userId) return
    load()

    // Live: new notifications for this user (RLS also limits events to the recipient).
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification
          setItems(prev => (prev.some(p => p.id === n.id) ? prev : [n, ...prev].slice(0, 50)))
          toastRef.current({ title: n.title, description: n.body ?? undefined })
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as Notification
          setItems(prev => prev.map(p => (p.id === n.id ? { ...p, read_at: n.read_at } : p)))
        }
      )
      .subscribe()

    // Catch up after the tab was hidden or offline; refresh relative times every minute.
    const onVisible = () => document.visibilityState === "visible" && load()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", load)
    const tick = setInterval(() => forceTick(t => t + 1), 60_000)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", load)
      clearInterval(tick)
    }
  }, [userId, load])

  const unread = items.filter(n => !n.read_at).length

  const markRead = async (ids: string[]) => {
    if (ids.length === 0) return
    const now = new Date().toISOString()
    setItems(prev => prev.map(n => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)))
    await supabase.from("notifications").update({ read_at: now }).in("id", ids)
  }

  const dismiss = async (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id))
    await supabase.from("notifications").delete().eq("id", id)
  }

  const openItem = (n: Notification) => {
    if (!n.read_at) markRead([n.id])
    if (n.link_tab && onNavigate) {
      onNavigate(n.link_tab)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
          title="Notifications"
          className="relative size-9 text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markRead(items.filter(n => !n.read_at).map(n => n.id))}
              className="rounded text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Mark all as read
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted">
              <Bell className="size-4 text-muted-foreground" />
            </span>
            <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">New tasks, ratings and updates will show up here.</p>
          </div>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto py-1">
            {items.map(n => {
              const meta = TYPE_ICON[n.type] ?? { icon: Bell, className: "bg-muted text-muted-foreground" }
              const Icon = meta.icon
              return (
                <li key={n.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 pr-10 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                      !n.read_at && "bg-brand-soft/40"
                    )}
                  >
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg", meta.className)}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm leading-snug", !n.read_at ? "font-medium" : "text-muted-foreground")}>
                        {n.title}
                      </span>
                      {n.body && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    aria-label={`Dismiss: ${n.title}`}
                    className="absolute right-2 top-2.5 grid size-6 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="border-t px-4 py-2 text-center text-[11px] text-muted-foreground">
          Notifications are kept for 7 days
        </p>
      </PopoverContent>
    </Popover>
  )
}
