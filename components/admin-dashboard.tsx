"use client"

import { useState } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin-sidebar"
import { DashboardContent } from "@/components/dashboard-content"
import { EmployeesContent } from "@/components/employees-content"
import { TasksContent } from "@/components/tasks-content"
import SimplePerformanceContent from "@/components/simple-performance-content"
import SimpleAttendanceContent from "@/components/simple-attendance-content"
import { NotesPanel } from "@/components/notes-panel"
import { DashboardHeader } from "@/components/dashboard-header"
import { SupabaseTest } from "@/components/supabase-test"
import { DatabaseTest } from "@/components/database-test"
import { SimpleTasksContent } from "@/components/simple-tasks-content"

interface AdminDashboardProps {
  user: any
  onLogout: () => void
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [showNotes, setShowNotes] = useState(false)

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent />
      case "employees":
        return <EmployeesContent />
      case "tasks":
        return <SimpleTasksContent />
      case "performance":
        return <SimplePerformanceContent />
      case "attendance":
        return <SimpleAttendanceContent />
      case "system-test":
        return <SupabaseTest />
      case "database-test":
        return <DatabaseTest />
      default:
        return <DashboardContent />
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar 
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
              userRole={user.role}
            />
          </div>
        )}
      </div>
    </SidebarProvider>
  )
}
