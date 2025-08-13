
"use client"
// Close notes panel on ESC key (desktop only)
// ...existing code...

import React, { useState, useEffect } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { EmployeeSidebar } from "@/components/employee-sidebar"
import { MyTasksContent } from "@/components/my-tasks-content"
import MyPerformanceContent from "@/components/my-performance-content"
import { MyAttendanceContent } from "@/components/my-attendance-content"
import { NotesPanel } from "@/components/notes-panel"
import { DashboardHeader } from "@/components/dashboard-header"

interface EmployeeDashboardProps {
  user: any
  onLogout: () => void
}

export function EmployeeDashboard({ user, onLogout }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState("tasks")
  const [showNotes, setShowNotes] = useState(false)

  // Close notes panel on ESC key (desktop only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showNotes && window.innerWidth >= 768) {
        e.preventDefault();
        setShowNotes(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [showNotes]);

  const renderContent = () => {
    switch (activeTab) {
      case "tasks":
        return <MyTasksContent userId={user.id?.toString() || user.id} />
      case "performance":
        return <MyPerformanceContent userId={user.id?.toString() || user.id} />
      case "attendance":
        return <MyAttendanceContent />
      default:
        return <MyTasksContent userId={user.id?.toString() || user.id} />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <EmployeeSidebar 
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
            onLogout={onLogout}
            showNotes={showNotes}
            setShowNotes={setShowNotes}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
          </main>
        </div>
        {showNotes && (
          <div className="w-full md:w-80 lg:w-96 border-l bg-background">
            <NotesPanel 
              isOpen={showNotes} 
              onClose={() => setShowNotes(false)}
              userId={user.id}
              userRole="employee"
            />
          </div>
        )}
      </div>
    </SidebarProvider>
  )
}
