"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ClipboardList, TrendingUp, Calendar, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@supabase/supabase-js'

interface DashboardStats {
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  averageRating: number
  presentToday: number
}

interface ChartData {
  taskStatusData: Array<{ name: string; value: number; color: string }>
  employeePerformanceData: Array<{ name: string; rating: number }>
  taskDistributionData: Array<{ employee: string; tasks: number }>
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
    averageRating: 0,
    presentToday: 0
  })
  const [chartData, setChartData] = useState<ChartData>({
    taskStatusData: [],
    employeePerformanceData: [],
    taskDistributionData: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    if (!supabase) {
      setError('Supabase client not available')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log('Loading dashboard data...')
      
      // Load employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, role')
      
      if (employeesError) {
        console.error('Error loading employees:', employeesError)
        throw new Error(`Failed to load employees: ${employeesError.message}`)
      }

      // Load tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to, employees(name)')
      
      if (tasksError) {
        console.error('Error loading tasks:', tasksError)
        throw new Error(`Failed to load tasks: ${tasksError.message}`)
      }

      // Load performance ratings
      const { data: ratings, error: ratingsError } = await supabase
        .from('performance_ratings')
        .select('rating, employees(name)')
      
      if (ratingsError) {
        console.error('Error loading ratings:', ratingsError)
        throw new Error(`Failed to load performance ratings: ${ratingsError.message}`)
      }

      // Load today's attendance
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('status, employees(name)')
        .eq('date', today)
      
      if (attendanceError) {
        console.error('Error loading attendance:', attendanceError)
        // Don't throw error for attendance as it might not exist
      }

      console.log('Data loaded:', { employees, tasks, ratings, attendance })

      // Calculate basic stats
      const totalEmployees = employees?.length || 0
      const totalTasks = tasks?.length || 0
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0
      const averageRating = ratings && ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
        : 0
      const presentToday = attendance?.filter(a => a.status === 'present').length || 0

      setStats({
        totalEmployees,
        totalTasks,
        completedTasks,
        averageRating,
        presentToday
      })

      // Task Status Distribution
      const statusCounts = {
        pending: tasks?.filter(t => t.status === 'pending').length || 0,
        'in_progress': tasks?.filter(t => t.status === 'in_progress').length || 0,
        completed: tasks?.filter(t => t.status === 'completed').length || 0
      }

      const taskStatusData = [
        { name: 'Pending', value: statusCounts.pending, color: '#ef4444' },
        { name: 'In Progress', value: statusCounts.in_progress, color: '#f59e0b' },
        { name: 'Completed', value: statusCounts.completed, color: '#22c55e' }
      ].filter(item => item.value > 0)

      // Employee Performance Data
      const performanceMap = new Map()
      ratings?.forEach(rating => {
        const name = (rating.employees as any)?.name || 'Unknown'
        if (!performanceMap.has(name)) {
          performanceMap.set(name, [])
        }
        performanceMap.get(name).push(rating.rating)
      })

      const employeePerformanceData = Array.from(performanceMap.entries()).map(([name, ratings]) => ({
        name: name.split(' ')[0], // First name only for charts
        rating: Number((ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length).toFixed(1))
      }))

      // Task Distribution by Employee
      const taskDistribution = new Map()
      tasks?.forEach(task => {
        if (task.assigned_to && task.employees) {
          const name = (task.employees as any).name
          taskDistribution.set(name, (taskDistribution.get(name) || 0) + 1)
        }
      })

      const taskDistributionData = Array.from(taskDistribution.entries()).map(([name, count]) => ({
        employee: name.split(' ')[0], // First name only for charts
        tasks: count
      }))

      setChartData({
        taskStatusData,
        employeePerformanceData,
        taskDistributionData
      })

      console.log('Dashboard data processed:', {
        stats: { totalEmployees, totalTasks, completedTasks, averageRating, presentToday },
        taskStatusData,
        employeePerformanceData,
        taskDistributionData
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Overview of your office management system
          </p>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <p className="text-red-800">{error}</p>
            <button 
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry Loading
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Overview of your office management system
        </p>
      </div>

      {/* Key Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} completed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              out of {stats.totalEmployees}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Task Status Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>
              Current status of all tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No task data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
            <CardDescription>
              Average performance ratings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.employeePerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.employeePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
            <CardDescription>
              Tasks assigned per employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.taskDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.taskDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="employee" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No task assignment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
