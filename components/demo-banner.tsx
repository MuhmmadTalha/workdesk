"use client"

import { useState } from "react"
import { ArrowLeftRight, FlaskConical, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { resetDemo } from "@/lib/demo/store"

/** Thin bar shown above the dashboard while a visitor is exploring the demo. */
export function DemoBanner() {
  const { user, isDemo, loginDemo } = useAuth()
  const [confirmReset, setConfirmReset] = useState(false)
  if (!isDemo || !user) return null

  const other = user.role === "admin" ? "employee" : "admin"

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-warning/30 bg-warning-soft px-3 py-1.5 text-xs text-warning-soft-foreground sm:px-4">
      <FlaskConical className="size-3.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Demo mode</span>
        <span className="hidden sm:inline"> · Changes are saved only in this browser. Try assigning a task as admin, then switch to the employee view.</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => loginDemo(other)}>
          <ArrowLeftRight className="mr-1 size-3.5" />
          View as {other === "admin" ? "Admin" : "Employee"}
        </Button>
        {confirmReset ? (
          <>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { resetDemo(); window.location.reload() }}>
              Yes, reset
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="mr-1 size-3.5" />
            Reset data
          </Button>
        )}
      </div>
    </div>
  )
}
