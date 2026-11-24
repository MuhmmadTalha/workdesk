"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { browserTimeZone, localDateString } from "@/lib/utils"

interface AvailabilityButtonProps {
  userId: string
}

const isWithinWorkingHours = () => {
  const hour = new Date().getHours()
  return hour >= 9 && hour < 18
}

// Check-in / check-out. The database functions check_in()/check_out() use the
// server clock and compute hours_worked, so times can't be edited from the browser.
export function AvailabilityButton({ userId }: AvailabilityButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isWorkingHours, setIsWorkingHours] = useState(false)
  const { toast } = useToast()

  const checkTodayAvailability = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('check_in_time, check_out_time')
      .eq('employee_id', userId)
      .eq('date', localDateString())
      .maybeSingle()

    setIsAvailable(!!data?.check_in_time && !data?.check_out_time)
  }, [userId])

  useEffect(() => {
    checkTodayAvailability()
    setIsWorkingHours(isWithinWorkingHours())
    const interval = setInterval(() => setIsWorkingHours(isWithinWorkingHours()), 60000)
    return () => clearInterval(interval)
  }, [checkTodayAvailability])

  useLiveRefresh(["attendance"], checkTodayAvailability, !!userId)

  const toggleAvailability = async () => {
    setIsLoading(true)
    const fn = isAvailable ? 'check_out' : 'check_in'
    const { data, error } = await supabase.rpc(fn, { p_tz: browserTimeZone() })
    setIsLoading(false)

    if (error) {
      toast({ title: "Error", description: `Failed to update availability: ${error.message}`, variant: "destructive" })
      return
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (isAvailable) {
      setIsAvailable(false)
      toast({ title: "Checked Out", description: `You checked out at ${time}. Hours today: ${data?.hours_worked ?? 0}` })
    } else {
      setIsAvailable(true)
      toast({ title: "Checked In", description: `You are marked available since ${time}` })
    }
  }

  // Outside working hours, still show the button if the employee needs to check out.
  if (!isWorkingHours && !isAvailable) {
    return null
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggleAvailability}
      disabled={isLoading}
      title={isAvailable ? "You are checked in. Click to check out." : "Start your day"}
      className="h-8 gap-2 px-3 font-medium"
    >
      <span className="relative flex size-2">
        {isAvailable && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />}
        <span className={`relative inline-flex size-2 rounded-full ${isAvailable ? "bg-success" : "bg-muted-foreground/50"}`} />
      </span>
      {isAvailable ? (
        <>
          <span className="hidden sm:inline">Checked in</span>
          <LogOut className="size-3.5 text-muted-foreground sm:hidden" />
          <span className="sr-only sm:not-sr-only sm:text-muted-foreground">· Check out</span>
        </>
      ) : (
        <>
          <LogIn className="size-3.5" />
          Check in
        </>
      )}
    </Button>
  )
}
