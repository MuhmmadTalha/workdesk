"use client"

import React, { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ClipboardList, TrendingUp, CalendarDays } from "lucide-react"
import { MyTasksContent } from "@/components/my-tasks-content"
import MyPerformanceContent from "@/components/my-performance-content"
import { MyAttendanceContent } from "@/components/my-attendance-content"
import { NotesPanel } from "@/components/notes-panel"
import { DashboardHeader } from "@/components/dashboard-header"
import type { User } from "@/contexts/auth-context"

const NAV_ITEMS = [
  { id: "tasks", title: "My tasks", icon: ClipboardList },
  { id: "attendance", title: "Attendance", icon: CalendarDays },
  { id: "performance", title: "Performance", icon: TrendingUp },
]

interface EmployeeDashboardProps {
  user: User
  onLogout: () => void
}

export function EmployeeDashboard({ user, onLogout }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState("tasks")
  const [showNotes, setShowNotes] = useState(false)

  // Close notes panel on ESC key (all screen sizes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let open dialogs/menus handle Escape themselves first.
      if (e.key === "Escape" && showNotes && !document.querySelector("[role=dialog], [role=alertdialog], [role=menu], [role=listbox]")) {
        e.preventDefault()
        setShowNotes(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [showNotes])

  const renderContent = () => {
    switch (activeTab) {
      case "performance":
        return <MyPerformanceContent userId={user.id} />
      case "attendance":
        return <MyAttendanceContent userId={user.id} />
      case "tasks":
      default:
        return <MyTasksContent userId={user.id} />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <AppSidebar
          items={NAV_ITEMS}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={onLogout}
          showNotes={showNotes}
          setShowNotes={setShowNotes}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            user={user}
            title={NAV_ITEMS.find(i => i.id === activeTab)?.title ?? ""}
            showNotes={showNotes}
            setShowNotes={setShowNotes}
            onNavigate={setActiveTab}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">
              {renderContent()}
            </div>
          </main>
        </div>
        {showNotes && (
          <div
            role="region"
            aria-label="My notes"
            className="fixed inset-0 z-40 overflow-hidden bg-background animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(560px,calc(100svh-6rem))] sm:w-[380px] sm:rounded-xl sm:border sm:shadow-2xl"
          >
            <NotesPanel
              isOpen={showNotes}
              onClose={() => setShowNotes(false)}
              userId={user.id}
            />
          </div>
        )}
      </div>
    </SidebarProvider>
  )
}
