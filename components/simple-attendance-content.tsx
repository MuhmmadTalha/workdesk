'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase, ATTENDANCE_STATUSES, attendanceLabel, type AttendanceStatus } from '@/lib/supabase'
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { localDateString } from '@/lib/utils'
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, ClipboardCheck, UserCheck, Timer, CalendarX2 } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { AttendanceBadge, EmptyState, ErrorState, SectionSkeleton } from '@/components/feedback-states'
import { formatDate } from '@/lib/date-utils'
import { InitialsAvatar } from '@/components/initials-avatar'

interface Employee {
  id: string
  name: string
  email: string
  role?: string
}

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  status: string
  hours_worked: number
  check_in_time: string | null
  check_out_time: string | null
  notes: string | null
  employee: Employee | undefined
}


const emptyRecord = () => ({
  employee_id: '',
  date: localDateString(),
  status: '' as AttendanceStatus | '',
  hours_worked: '',
  notes: '',
})

export default function SimpleAttendanceContent() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newRecord, setNewRecord] = useState(emptyRecord)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      // Everyone (admins can check in too) so names resolve; only employees are offered in the form.
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .order('name')

      if (employeesError) {
        setError(`Error loading employees: ${employeesError.message}`)
        return
      }
      setEmployees((employeesData || []).filter(e => e.role === 'employee'))

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, employee_id, date, status, hours_worked, check_in_time, check_out_time, notes')
        .order('date', { ascending: false })
        .limit(100)

      if (attendanceError) {
        setError(`Error loading attendance: ${attendanceError.message}`)
        return
      }

      const employeeMap = new Map((employeesData || []).map(emp => [emp.id, emp]))
      setAttendance((attendanceData || []).map(record => ({
        ...record,
        hours_worked: Number(record.hours_worked),
        employee: employeeMap.get(record.employee_id),
      })))
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useLiveRefresh(["attendance", "employees"], () => loadData())

  const saveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRecord.employee_id || !newRecord.status) {
      toast({ title: "Missing fields", description: "Choose an employee and a status.", variant: "destructive" })
      return
    }

    const defaultHours = ATTENDANCE_STATUSES.find(s => s.value === newRecord.status)?.defaultHours ?? 0
    const hours = newRecord.hours_worked === '' ? defaultHours : Number(newRecord.hours_worked)
    if (Number.isNaN(hours) || hours < 0 || hours > 24) {
      toast({ title: "Invalid hours", description: "Hours worked must be between 0 and 24.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    // Upsert: marking the same employee/day again updates the existing record.
    const { error } = await supabase
      .from('attendance')
      .upsert({
        employee_id: newRecord.employee_id,
        date: newRecord.date,
        status: newRecord.status,
        hours_worked: hours,
        notes: newRecord.notes.trim() || null,
      }, { onConflict: 'employee_id,date' })
    setSubmitting(false)

    if (error) {
      toast({ title: "Error", description: `Could not save attendance: ${error.message}`, variant: "destructive" })
      return
    }

    toast({ title: "Saved", description: "Attendance record saved" })
    setNewRecord(emptyRecord())
    setIsDialogOpen(false)
    await loadData()
  }

  if (loading) {
    return (
      <SectionSkeleton stats={4} rows={5} label="Loading attendance" />
    )
  }

  const avgHours = attendance.length > 0
    ? (attendance.reduce((sum, r) => sum + r.hours_worked, 0) / attendance.length).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage employee attendance records
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Mark Attendance
        </Button>
      </div>

      {error && (
        <Card className="py-0">
          <ErrorState title="Couldn't load attendance" message={error} onRetry={() => { setLoading(true); loadData() }} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Employees" value={employees.length} icon={Users} tone="brand" />
        <StatCard label="Records" value={attendance.length} icon={ClipboardCheck} tone="info" hint="Last 100 entries" />
        <StatCard label="Present" value={attendance.filter(r => r.status === 'present').length} icon={UserCheck} tone="success" />
        <StatCard label="Avg hours" value={avgHours} icon={Timer} tone="warning" empty={avgHours === '0.0' || avgHours === '0'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records ({attendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="No attendance records yet"
              description="Mark attendance for an employee to start tracking."
              action={<Button size="sm" onClick={() => setIsDialogOpen(true)}><Plus aria-hidden="true" />Mark attendance</Button>}
            />
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div key={record.id} className="rounded-lg border p-4 transition-colors duration-150 hover:bg-muted/40">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <InitialsAvatar name={record.employee?.name || 'Former employee'} />
                      <div className="min-w-0">
                        <h4 className="truncate font-semibold">{record.employee?.name || 'Former employee'}</h4>
                        <p className="truncate text-sm text-muted-foreground">{record.employee?.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <AttendanceBadge status={record.status} label={attendanceLabel(record.status)} />
                      <p className="text-xs text-muted-foreground">{formatDate(record.date)}</p>
                    </div>
                  </div>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    {record.check_in_time && (!record.check_out_time || record.check_out_time.slice(0, 5) === record.check_in_time.slice(0, 5)) && record.hours_worked === 0
                      ? <span className="font-medium text-foreground">Shift in progress</span>
                      : <>Hours worked: <span className="font-medium text-foreground">{record.hours_worked}</span></>}
                    {record.check_in_time && <> · In {record.check_in_time.slice(0, 5)}</>}
                    {record.check_out_time && <> · Out {record.check_out_time.slice(0, 5)}</>}
                  </p>
                  {record.notes && <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Employee Attendance</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveAttendance} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Employee</Label>
              <Select
                value={newRecord.employee_id}
                onValueChange={(value) => setNewRecord({ ...newRecord, employee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="att-date">Date</Label>
              <Input
                id="att-date"
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={newRecord.status}
                onValueChange={(value) => setNewRecord({ ...newRecord, status: value as AttendanceStatus })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ATTENDANCE_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="att-hours">Hours worked (optional)</Label>
              <Input
                id="att-hours"
                type="number"
                min={0}
                max={24}
                step={0.25}
                value={newRecord.hours_worked}
                onChange={(e) => setNewRecord({ ...newRecord, hours_worked: e.target.value })}
                placeholder={`Default: ${ATTENDANCE_STATUSES.find(s => s.value === newRecord.status)?.defaultHours ?? '—'}`}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="att-notes">Notes (optional)</Label>
              <Input
                id="att-notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If a record already exists for this employee and date, it will be updated.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
