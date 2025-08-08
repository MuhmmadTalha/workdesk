"use client"

import { useState, useEffect } from "react"
import { Clock } from "lucide-react"

interface LiveTimeProps {
  className?: string
}

export function LiveTime({ className = "" }: LiveTimeProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <div className="flex flex-col text-sm">
        <span className="font-mono font-medium">{formatTime(time)}</span>
        <span className="text-xs text-muted-foreground">{formatDate(time)}</span>
      </div>
    </div>
  )
}
