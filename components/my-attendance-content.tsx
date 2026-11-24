"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CalendarCheck, Clock, CalendarX } from "lucide-react"
import { AttendanceBadge, EmptyState, ErrorState } from "@/components/feedback-states"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/date-utils"
import { supabase, attendanceLabel } from "@/lib/supabase"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { StatCard } from "@/components/stat-card"

interface AttendanceRow {
  id: string
  date: string
  status: string
  hours_worked: number
  check_in_time: string | null
  check_out_time: string | null
  notes: string | null
}

const PRESENT_LIKE = ["present", "late", "half_day", "remote"]

export function MyAttendanceContent({ userId }: { userId: string }) {
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false, isCancelled: () => boolean = () => false) => {
    {
      if (!silent) setLoading(true)
      const { data, error } = await supabase
        .from("attendance")
        .select("id, date, status, hours_worked, check_in_time, check_out_time, notes")
        .eq("employee_id", userId)
        .order("date", { ascending: false })
        .limit(60)
      if (isCancelled()) return
      if (error) {
        setError("Failed to load attendance.")
      } else {
        setRows((data || []).map(r => ({ ...r, hours_worked: Number(r.hours_worked) })))
      }
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    load(false, () => cancelled)
    return () => { cancelled = true }
  }, [load])

  useLiveRefresh(["attendance"], () => load(true), !!userId)

  const last30 = rows.slice(0, 30)
  const daysPresent = last30.filter(r => PRESENT_LIKE.includes(r.status)).length
  const daysAway = last30.length - daysPresent
  const totalHours = last30.reduce((sum, r) => sum + r.hours_worked, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the Check in / Check out button in the top bar during working hours (9:00–18:00).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Days present" value={daysPresent} icon={CalendarCheck} tone="success" hint={`Last ${last30.length} records`} />
        <StatCard label="Days away" value={daysAway} icon={CalendarX} tone="danger" hint="Absent, sick, leave" />
        <StatCard label="Hours logged" value={totalHours.toFixed(1)} icon={Clock} tone="info" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Your most recent attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Loading attendance…</span>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState title="Couldn't load attendance" message={error} onRetry={() => window.location.reload()} />
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No attendance records yet" description="Check in from the top bar to start your history." />
          ) : (
            <>
            {/* Mobile: compact list */}
            <ul className="divide-y rounded-lg border sm:hidden">
              {rows.map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDate(r.date)}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {r.check_in_time?.slice(0, 5) ?? "—"} → {r.check_out_time?.slice(0, 5) ?? "—"} · {r.hours_worked}h
                    </p>
                  </div>
                  <AttendanceBadge status={r.status} label={attendanceLabel(r.status)} />
                </li>
              ))}
            </ul>
            <div className="hidden w-full overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check in</TableHead>
                    <TableHead>Check out</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell>
                        <AttendanceBadge status={r.status} label={attendanceLabel(r.status)} />
                      </TableCell>
                      <TableCell className="tabular-nums">{r.check_in_time?.slice(0, 5) ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{r.check_out_time?.slice(0, 5) ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.hours_worked}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
