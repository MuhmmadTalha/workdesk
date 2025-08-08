"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { UserCheck, UserX } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface AvailabilityButtonProps {
  userId: string
  userName: string
}

export function AvailabilityButton({ userId, userName }: AvailabilityButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isWorkingHours, setIsWorkingHours] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    checkTodayAvailability()
    checkWorkingHours()
    
    // Check working hours every minute
    const interval = setInterval(checkWorkingHours, 60000)
    return () => clearInterval(interval)
  }, [userId])

  const checkWorkingHours = () => {
    const now = new Date()
    const currentHour = now.getHours()
    setIsWorkingHours(currentHour >= 9 && currentHour < 18)
  }

  const checkTodayAvailability = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', userId)
        .eq('date', today)
        .single()

      if (error && error.code !== 'PGRST116') { // Not found error is OK
        console.error('Database error details:', error)
        throw error
      }

      setIsAvailable(!!data && (data.status === 'present' || data.status === 'remote'))
    } catch (error) {
      console.error('Error checking availability:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    }
  }

  const toggleAvailability = async () => {
    setIsLoading(true)
    
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
      const localTime = now.toLocaleTimeString()

      if (!isAvailable) {
        // Mark as available/present
        const { error } = await supabase
          .from('attendance')
          .upsert({
            employee_id: userId,
            date: today,
            status: 'present',
            check_in_time: currentTime,
            check_out_time: null
          }, {
            onConflict: 'employee_id,date'
          })

        if (error) {
          console.error('Database error details:', error)
          throw error
        }

        setIsAvailable(true)
        toast({
          title: "Marked Available",
          description: `You are now marked as available at ${localTime}`,
        })
      } else {
        // Mark as checked out
        const { error } = await supabase
          .from('attendance')
          .update({
            check_out_time: currentTime
          })
          .eq('employee_id', userId)
          .eq('date', today)

        if (error) {
          console.error('Database error details:', error)
          throw error
        }

        setIsAvailable(false)
        toast({
          title: "Checked Out",
          description: `You checked out at ${localTime}`,
        })
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: "Error",
        description: `Failed to update availability: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render the button if outside working hours
  if (!isWorkingHours) {
    return null
  }

  return (
    <Button
      size="sm"
      onClick={toggleAvailability}
      disabled={isLoading}
      className={
        isAvailable 
          ? "bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-sm" 
          : "bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500 shadow-sm"
      }
    >
      {isAvailable ? (
        <>
          <UserCheck className="h-4 w-4 mr-2" />
          Available
        </>
      ) : (
        <>
          <UserX className="h-4 w-4 mr-2" />
          Make Available
        </>
      )}
    </Button>
  )
}
