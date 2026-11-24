"use client"

import { useState } from "react"
import { KeyRound, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LiveTime } from "@/components/live-time"
import { AvailabilityButton } from "@/components/availability-button"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { NotificationBell } from "@/components/notification-bell"
import { DemoBanner } from "@/components/demo-banner"
import { APP_NAME } from "@/lib/brand"
import type { User } from "@/contexts/auth-context"

interface DashboardHeaderProps {
  user: User
  title: string
  showNotes: boolean
  setShowNotes: (show: boolean) => void
  onNavigate?: (tab: string) => void
}

export function DashboardHeader({ user, title, showNotes, setShowNotes, onNavigate }: DashboardHeaderProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  return (
    <>
    <DemoBanner />
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/85 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-4">
      <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground" />
      <div className="h-5 w-px bg-border" aria-hidden="true" />
      <p className="min-w-0 truncate text-sm"><span className="hidden text-muted-foreground sm:inline">{APP_NAME} / </span><span className="font-medium">{title}</span></p>
      {user.role === "employee" && (
        <div className="ml-1 shrink-0 sm:ml-3">
          <AvailabilityButton userId={user.id} />
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LiveTime className="hidden rounded-full border bg-card px-3 py-1 md:flex" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notes"
          aria-pressed={showNotes}
          onClick={() => setShowNotes(!showNotes)}
          className="size-9 text-muted-foreground hover:text-foreground md:hidden"
        >
          <StickyNote className="size-4" />
        </Button>
        <NotificationBell userId={user.id} onNavigate={onNavigate} />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Change password"
          title="Change password"
          onClick={() => setShowPasswordDialog(true)}
          className="size-9 text-muted-foreground hover:text-foreground"
        >
          <KeyRound className="size-4" />
        </Button>
        <ThemeToggle />
      </div>

      <ChangePasswordDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog} />
    </header>
    </>
  )
}
