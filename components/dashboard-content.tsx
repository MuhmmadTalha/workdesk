'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@supabase/supabase-js'

interface DashboardStats {
  totalEmployees: number
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  averagePerformance: number
}

interface TaskStatusData {
  name: string
  value: number
  color: string
}

interface EmployeePerformanceData {
  name: string
  rating: number
}

interface TaskDistributionData {
  employee: string
  tasks: number
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    averagePerformance: 0
  })
  
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([])
  const [employeePerformanceData, setEmployeePerformanceData] = useState<EmployeePerformanceData[]>([])
  const [taskDistributionData, setTaskDistributionData] = useState<TaskDistributionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

  const loadDashboardData = async () => {
    if (!supabase) {
      setError('Supabase client not available')
      setLoading(false)
      return
    }

    try {
      console.log('Loading dashboard data...')
      
      // Load all data with simple queries (no complex relationships)
      const [employeesResult, tasksResult, performanceResult] = await Promise.all([
        supabase.from('employees').select('id, name, email'),
        supabase.from('tasks').select('*'),
        supabase.from('performance_ratings').select('rating, employee_id')
      ])

      // Process employees data
      const employees = employeesResult.data || []
      console.log('Employees loaded:', employees.length)

      // Process tasks data
      const tasks = tasksResult.data || []
      console.log('Tasks loaded:', tasks.length)
      
      const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'Completed').length
      const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'Pending').length
      const inProgressTasks = tasks.filter(task => task.status === 'in_progress' || task.status === 'In Progress').length

      // Process performance data
      const performances = performanceResult.data || []
      console.log('Performance ratings loaded:', performances.length)
      
      const averagePerformance = performances.length > 0 
        ? performances.reduce((sum, p) => sum + (p.rating || 0), 0) / performances.length
        : 0

      // Set stats
      setStats({
        totalEmployees: employees.length,
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks,
        averagePerformance: Math.round(averagePerformance * 10) / 10
      })

      // Set task status data for pie chart
      setTaskStatusData([
        { name: 'Completed', value: completedTasks, color: '#22c55e' },
        { name: 'In Progress', value: inProgressTasks, color: '#f59e0b' },
        { name: 'Pending', value: pendingTasks, color: '#ef4444' }
      ].filter(item => item.value > 0))

      // Build employee performance data
      const employeePerformanceMap = new Map()
      const employeesMap = new Map()
      employees.forEach(emp => employeesMap.set(emp.id, emp.name))
      
      performances.forEach((rating: any) => {
        const employeeName = employeesMap.get(rating.employee_id) || 'Unknown'
        if (!employeePerformanceMap.has(employeeName)) {
          employeePerformanceMap.set(employeeName, [])
        }
        employeePerformanceMap.get(employeeName).push(rating.rating)
      })

      const performanceData = Array.from(employeePerformanceMap.entries()).map(([name, ratings]: [string, number[]]) => ({
        name,
        rating: Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
      })).slice(0, 10)

      setEmployeePerformanceData(performanceData)

      // Build task distribution data from task assignments
      const { data: taskAssignments } = await supabase
        .from('task_assignments')
        .select('employee_id')
      
      const taskDistributionMap = new Map()
      if (taskAssignments) {
        taskAssignments.forEach((assignment: any) => {
          const employeeName = employeesMap.get(assignment.employee_id) || 'Unassigned'
          taskDistributionMap.set(employeeName, (taskDistributionMap.get(employeeName) || 0) + 1)
        })
      }

      const distributionData = Array.from(taskDistributionMap.entries()).map(([employee, tasks]) => ({
        employee,
        tasks
      })).slice(0, 10)

      setTaskDistributionData(distributionData)

      setError(null)
      console.log('Dashboard data loaded successfully')

    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(`Failed to load dashboard data: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <span className="text-2xl">✅</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <span className="text-2xl">⭐</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averagePerformance}/5</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {taskStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent?: number }) => 
                      `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No task data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {employeePerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeePerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Distribution */}
      {taskDistributionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Distribution by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="employee" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
