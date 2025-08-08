'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'
import { useToast } from "@/hooks/use-toast"
import { Plus } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
}

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  status: string
  hours_worked: number
  employees: {
    name: string
    email: string
  } | null
}

export default function SimpleAttendanceContent() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()
  
  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [hoursWorked, setHoursWorked] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // New modal form state
  const [newRecord, setNewRecord] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    status: '',
    notes: ''
  })

  // Set default date on client side only
  useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [])

  const loadData = async () => {
    try {
      console.log('Loading employees and attendance records...')
      
      // Load employees (exclude admin from attendance marking)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .eq('role', 'employee')  // Only employees, not admins
        .order('name')

      if (employeesError) {
        console.error('Error loading employees:', employeesError)
        setError(`Error loading employees: ${employeesError.message}`)
        return
      }

      console.log('Employees loaded:', employeesData)
      setEmployees(employeesData || [])

      // Load attendance records - simple query first
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, employee_id, date, status, hours_worked')
        .order('date', { ascending: false })
        .limit(100)

      if (attendanceError) {
        console.error('Error loading attendance:', attendanceError)
        setError(`Error loading attendance: ${attendanceError.message}`)
        return
      }

      console.log('Attendance records loaded:', attendanceData)
      
      // Create employee map for names
      const employeeMap = new Map()
      employeesData?.forEach(emp => {
        employeeMap.set(emp.id, { name: emp.name, email: emp.email })
      })
      
      // Combine attendance data with employee names
      const attendanceWithEmployees = (attendanceData || []).map(record => ({
        ...record,
        employees: employeeMap.get(record.employee_id) || { name: 'Unknown', email: '' }
      }))
      
      setAttendance(attendanceWithEmployees)
      setError(null)

    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const addAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          employee_id: newRecord.employee_id,
          date: newRecord.date,
          status: newRecord.status.toLowerCase(),
          hours_worked: newRecord.status === 'Present' ? 8 : 0, // Default hours
          notes: newRecord.notes || null
        }])
        .select()

      if (error) {
        console.error('Error creating attendance record:', error)
        toast({
          title: "Error",
          description: `Error creating attendance record: ${error.message}`,
          variant: "destructive"
        })
        return
      }

      console.log('Attendance record created successfully:', data)
      toast({
        title: "Success",
        description: "Attendance record created successfully"
      })
      
      // Reset form and close dialog
      setNewRecord({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        status: '',
        notes: ''
      })
      setIsDialogOpen(false)
      
      // Reload data
      await loadData()

    } catch (err) {
      console.error('Unexpected error creating attendance record:', err)
      toast({
        title: "Error",
        description: `Unexpected error: ${err}`,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const addAttendanceRecord = async () => {
    if (!supabase) {
      setError('Supabase client not available')
      return
    }

    if (!selectedEmployee || !date || !status) {
      setError('Please fill in all required fields')
      return
    }

    const hours = parseFloat(hoursWorked) || 0
    if (hours < 0 || hours > 24) {
      setError('Hours worked must be between 0 and 24')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      console.log('Creating attendance record...', {
        employee_id: selectedEmployee,
        date,
        status,
        hours_worked: hours
      })

      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            employee_id: selectedEmployee,
            date,
            status,
            hours_worked: hours
          }
        ])
        .select()

      if (error) {
        console.error('Error creating attendance record:', error)
        setError(`Error creating attendance record: ${error.message}`)
        return
      }

      console.log('Attendance record created successfully:', data)
      
      // Reset form and close dialog
      setSelectedEmployee('')
      setDate(new Date().toISOString().split('T')[0])
      setStatus('')
      setHoursWorked('')
      setIsDialogOpen(false)
      
      // Reload data
      await loadData()

    } catch (err) {
      console.error('Unexpected error creating attendance record:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Attendance Management</h2>
        <p>Loading attendance data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Track and manage employee attendance records
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Mark Attendance
        </Button>
      </div>
      
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics - Moved to Top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">{employees.length}</div>
              <p className="text-gray-600 text-sm md:text-base">Total Employees</p>
            </div>
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">{attendance.length}</div>
              <p className="text-gray-600 text-sm md:text-base">Total Records</p>
            </div>
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">
                {attendance.filter(r => r.status === 'present').length}
              </div>
              <p className="text-gray-600 text-sm md:text-base">Present</p>
            </div>
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">
                {attendance.length > 0 
                  ? (attendance.reduce((sum, r) => sum + r.hours_worked, 0) / attendance.length).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-gray-600 text-sm md:text-base">Avg Hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance Records ({attendance.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <p className="text-gray-500">No attendance records found.</p>
          ) : (
            <div className="space-y-4">
              {attendance.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{record.employees?.name || 'Unknown Employee'}</h4>
                      <p className="text-sm text-gray-600">{record.employees?.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold capitalize">
                        {record.status}
                        {record.status === 'present' && ' ✅'}
                        {record.status === 'absent' && ' ❌'}
                        {record.status === 'late' && ' ⏰'}
                        {record.status === 'sick' && ' 🤒'}
                        {record.status === 'vacation' && ' 🏖️'}
                        {record.status === 'remote' && ' 🏠'}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDate(record.date)}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">
                    Hours Worked: {record.hours_worked}
                  </p>
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
          <form onSubmit={addAttendance} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee</Label>
              <Select 
                value={newRecord.employee_id} 
                onValueChange={(value) => setNewRecord({...newRecord, employee_id: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newRecord.date}
                onChange={(e) => setNewRecord({...newRecord, date: e.target.value})}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={newRecord.status} 
                onValueChange={(value) => setNewRecord({...newRecord, status: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={newRecord.notes}
                onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Mark Attendance</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
