"use client"

import { Calendar, ClipboardList, TrendingUp, User, LogOut, StickyNote, X } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const menuItems = [
  { id: "tasks", title: "My Tasks", icon: ClipboardList },
  { id: "performance", title: "Performance", icon: TrendingUp },
  { id: "attendance", title: "Attendance", icon: Calendar },
]

interface EmployeeSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  user: any
  onLogout: () => void
  showNotes: boolean
  setShowNotes: (show: boolean) => void
}

export function EmployeeSidebar({ activeTab, setActiveTab, user, onLogout, showNotes, setShowNotes }: EmployeeSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleItemClick = (tab: string) => {
    setActiveTab(tab)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleNotesToggle = () => {
    setShowNotes(!showNotes)
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6" />
            <span className="font-semibold">Employee Portal</span>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpenMobile(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Profile Picture Section */}
        <div className="flex items-center justify-center mt-4">
          <Avatar className="h-16 w-16 md:h-20 md:w-20">
            <AvatarImage src="/placeholder-user.jpg" alt="Profile Picture" />
            <AvatarFallback className="text-lg">
              {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'EM'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center mt-2">
          <p className="font-medium text-sm truncate">{user?.name || 'Employee'}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.role || 'Employee'}</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleItemClick(item.id)}
                    isActive={activeTab === item.id}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Notes Toggle */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleNotesToggle}
                  isActive={showNotes}
                >
                  <StickyNote className="h-4 w-4" />
                  <span>My Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'EM'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'Employee'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onLogout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
