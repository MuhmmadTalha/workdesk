"use client"

import type { LucideIcon } from "lucide-react"
import { LogOut, StickyNote, X } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import type { User } from "@/contexts/auth-context"
import { InitialsAvatar } from "@/components/initials-avatar"

export { initials } from "@/components/initials-avatar"

export interface NavItem {
  id: string
  title: string
  icon: LucideIcon
}

interface AppSidebarProps {
  items: NavItem[]
  activeTab: string
  setActiveTab: (tab: string) => void
  user: User
  onLogout: () => void
  showNotes: boolean
  setShowNotes: (show: boolean) => void
}

const navButtonClass =
  "relative h-10 gap-3 rounded-lg px-3 text-muted-foreground transition-colors duration-150 hover:text-foreground " +
  "data-[active=true]:bg-brand-soft data-[active=true]:font-medium data-[active=true]:text-foreground " +
  "data-[active=true]:before:absolute data-[active=true]:before:-left-1 data-[active=true]:before:top-2 data-[active=true]:before:bottom-2 " +
  "data-[active=true]:before:w-1 data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand"

export function AppSidebar({ items, activeTab, setActiveTab, user, onLogout, showNotes, setShowNotes }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar()

  const go = (fn: () => void) => {
    fn()
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar>
      <SidebarHeader className="h-14 flex-row items-center justify-between border-b px-4">
        <BrandMark />
        {isMobile && (
          <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setOpenMobile(false)} className="size-8">
            <X className="size-4" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent className="px-1 pt-2">
        <SidebarGroup>
          <SidebarGroupLabel>{user.role === "admin" ? "Manage" : "Workspace"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = activeTab === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => go(() => setActiveTab(item.id))}
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      className={navButtonClass}
                    >
                      <item.icon className={active ? "size-[18px] text-brand" : "size-[18px]"} aria-hidden="true" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Personal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => go(() => setShowNotes(!showNotes))}
                  isActive={showNotes}
                  className={navButtonClass}
                >
                  <StickyNote className={showNotes ? "size-[18px] text-brand" : "size-[18px]"} aria-hidden="true" />
                  <span>My notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-2 py-2">
          <InitialsAvatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
            <p className="truncate text-xs capitalize text-muted-foreground">
              {user.role}{user.position ? ` · ${user.position}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            aria-label="Sign out"
            title="Sign out"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
