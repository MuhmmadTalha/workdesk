"use client"

import React, { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { LayoutDashboard, Users, ClipboardList, TrendingUp, CalendarDays } from "lucide-react"
import { DashboardContent } from "@/components/dashboard-content"
import { EmployeeManagement } from "@/components/employee-management"
import SimplePerformanceContent from "@/components/simple-performance-content"
import SimpleAttendanceContent from "@/components/simple-attendance-content"
import { NotesPanel } from "@/components/notes-panel"
import { DashboardHeader } from "@/components/dashboard-header"
import { SimpleTasksContent } from "@/components/simple-tasks-content"
import type { User } from "@/contexts/auth-context"

const NAV_ITEMS = [
  { id: "dashboard", title: "Overview", icon: LayoutDashboard },
  { id: "employees", title: "Employees", icon: Users },
  { id: "tasks", title: "Tasks", icon: ClipboardList },
  { id: "performance", title: "Performance", icon: TrendingUp },
  { id: "attendance", title: "Attendance", icon: CalendarDays },
]

interface AdminDashboardProps {
  user: User
  onLogout: () => void
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
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
      case "employees":
        return <EmployeeManagement currentUserId={user.id} />
      case "tasks":
        return <SimpleTasksContent />
      case "performance":
        return <SimplePerformanceContent />
      case "attendance":
        return <SimpleAttendanceContent />
      case "dashboard":
      default:
        return <DashboardContent userName={user.name} onNavigate={setActiveTab} />
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
