"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Users, Clock, Loader2 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface AttendanceRecord {
  id: number
  employee_id: number
  employee_name: string
  date: string
  status: "Present" | "Absent" | "Late" | "Available"
  check_in: string | null
  check_out: string | null
}

export function AttendanceContent() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewType, setViewType] = useState<"daily" | "weekly" | "monthly">("daily")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [totalEmployees, setTotalEmployees] = useState(0)

  useEffect(() => {
    loadAttendanceData()
    loadEmployeeCount()
  }, [selectedDate, viewType])

  const loadEmployeeCount = async () => {
    try {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
      
      setTotalEmployees(count || 0)
    } catch (error) {
      console.error('Error loading employee count:', error)
    }
  }

  const loadAttendanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('attendance')
        .select(`
          id,
          employee_id,
          date,
          status,
          check_in,
          check_out,
          employees (
            id,
            name
          )
        `)

      // Filter based on view type
      if (viewType === "daily") {
        query = query.eq('date', selectedDate)
      } else if (viewType === "weekly") {
        const startDate = new Date(selectedDate)
        startDate.setDate(startDate.getDate() - startDate.getDay())
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6)
        
        query = query
          .gte('date', startDate.toISOString().split('T')[0])
          .lte('date', endDate.toISOString().split('T')[0])
      } else if (viewType === "monthly") {
        const date = new Date(selectedDate)
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0]
        
        query = query
          .gte('date', firstDay)
          .lte('date', lastDay)
      }

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      // Transform data to match our interface
      const transformedData: AttendanceRecord[] = (data || []).map((record: any) => ({
        id: record.id,
        employee_id: record.employee_id,
        employee_name: record.employees?.name || 'Unknown Employee',
        date: record.date,
        status: record.status as "Present" | "Absent" | "Late" | "Available",
        check_in: record.check_in,
        check_out: record.check_out
      }))

      setAttendance(transformedData)
    } catch (error) {
      console.error('Error loading attendance:', error)
      setError('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return "default"
      case "Available": return "secondary"
      case "Late": return "destructive"
      case "Absent": return "outline"
      default: return "outline"
    }
  }

  // Calculate stats from current attendance data
  const todayDate = new Date().toISOString().split('T')[0]
  const todayAttendance = attendance.filter(record => record.date === todayDate)
  
  const stats = {
    totalEmployees,
    presentToday: todayAttendance.filter(r => r.status === "Present").length,
    absentToday: todayAttendance.filter(r => r.status === "Absent").length,
    lateToday: todayAttendance.filter(r => r.status === "Late").length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Track employee attendance and check-in status
          </p>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:gap-2 md:space-y-0">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-40"
          />
          <Select value={viewType} onValueChange={(value: "daily" | "weekly" | "monthly") => setViewType(value)}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Present Today</CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-green-600">{stats.presentToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Absent Today</CardTitle>
            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold text-red-600">{stats.absentToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Late Today</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lateToday}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            {viewType.charAt(0).toUpperCase() + viewType.slice(1)} attendance view for {selectedDate}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading attendance data...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Employee</TableHead>
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[80px]">Check In</TableHead>
                    <TableHead className="min-w-[80px]">Check Out</TableHead>
                    <TableHead className="min-w-[80px]">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No attendance records found for the selected period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance.map((record: AttendanceRecord) => {
                    const calculateHours = (checkIn: string | null, checkOut: string | null) => {
                      if (!checkIn || !checkOut) return "-"
                      
                      try {
                        const inTime = new Date(`1970-01-01T${checkIn}`)
                        const outTime = new Date(`1970-01-01T${checkOut}`)
                        const diffMs = outTime.getTime() - inTime.getTime()
                        const hours = Math.floor(diffMs / (1000 * 60 * 60))
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
                        return `${hours}h ${minutes}m`
                      } catch {
                        return "-"
                      }
                    }
                    
                    const hours = calculateHours(record.check_in, record.check_out)
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employee_name}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.check_in || "-"}</TableCell>
                        <TableCell>{record.check_out || "-"}</TableCell>
                        <TableCell>{hours}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
