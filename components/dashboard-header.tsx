"use client"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { LogOut, Moon, Sun, StickyNote } from 'lucide-react'
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { LiveTime } from "@/components/live-time"
import { AvailabilityButton } from "@/components/availability-button"

interface DashboardHeaderProps {
  user: any
  onLogout: () => void
  showNotes: boolean
  setShowNotes: (show: boolean) => void
}

export function DashboardHeader({ user, onLogout, showNotes, setShowNotes }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <h1 className="font-semibold hidden sm:block">
              Welcome, <span className={user.role === 'admin' ? 'text-green-600' : 'text-blue-600'}>{user.name}</span>
            </h1>
            <h1 className="font-semibold sm:hidden">
              Hi, <span className={user.role === 'admin' ? 'text-green-600' : 'text-blue-600'}>{user.name.split(' ')[0]}</span>
            </h1>
          </div>
          {user.role === 'employee' && (
            <AvailabilityButton 
              userId={user.id} 
              userName={user.name}
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <LiveTime />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowNotes(!showNotes)}
              className="md:hidden"
            >
              <StickyNote className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="border border-gray-300 hover:border-gray-400"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onLogout}
              className="border border-gray-300 hover:border-gray-400 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
