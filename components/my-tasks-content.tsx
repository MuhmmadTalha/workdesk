"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  deadline: string
  status: "Pending" | "In Progress" | "Completed"
  priority: "Low" | "Medium" | "High"
}

interface MyTasksContentProps {
  userId: string
}

export function MyTasksContent({ userId }: MyTasksContentProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchTasks()
  }, [userId])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching tasks for user:', userId)
      
      if (!userId) {
        console.warn('⚠️ No userId provided')
        setTasks([])
        setLoading(false)
        return
      }
      
      // First try to get tasks with assignment status
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('task_assignments')
        .select(`
          status,
          assigned_at,
          completed_at,
          tasks!inner (
            id,
            title,
            description,
            deadline,
            priority,
            created_at
          )
        `)
        .eq('employee_id', userId)
        .order('assigned_at', { ascending: false })

      if (assignmentError) {
        console.warn('⚠️ Task assignments not available, falling back to tasks table:', assignmentError)
        // Fallback to original method
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .contains('assigned_to', [userId])
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Tasks error:', error)
          
          // Check if it's a database table issue
          if (error.message?.includes('relation "tasks" does not exist')) {
            toast({
              title: "Setup Required",
              description: "Task management requires database setup. Please contact your administrator.",
              variant: "destructive"
            })
          } else {
            throw error
          }
          setTasks([])
          return
        }
        
        console.log('✅ Tasks loaded (fallback method):', data?.length || 0)
        setTasks(data || [])
      } else {
        // Transform assignment data to task format
        const transformedTasks = assignmentData?.map((assignment: any) => ({
          id: assignment.tasks.id,
          title: assignment.tasks.title,
          description: assignment.tasks.description,
          deadline: assignment.tasks.deadline,
          priority: assignment.tasks.priority,
          status: assignment.status as "Pending" | "In Progress" | "Completed",
          created_at: assignment.tasks.created_at
        })) || []
        
        console.log('✅ Tasks loaded (assignment method):', transformedTasks.length)
        setTasks(transformedTasks)
      }
    } catch (error) {
      console.error('❌ Error fetching tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive",
      })
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "Completed" ? "Pending" : "Completed"
      
      // Update the task assignment status, not the main task
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .update({ 
          status: newStatus,
          completed_at: newStatus === "Completed" ? new Date().toISOString() : null
        })
        .eq('task_id', taskId)
        .eq('employee_id', userId)

      if (assignmentError) {
        console.error('Assignment update error:', assignmentError)
        // Fallback to updating the main task if assignment table doesn't exist
        const { error: taskError } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', taskId)

        if (taskError) throw taskError
      }

      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, status: newStatus as "Pending" | "In Progress" | "Completed" }
          : task
      ))

      toast({
        title: "Success",
        description: `Task marked as ${newStatus.toLowerCase()}`,
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "default"
      case "In Progress": return "secondary"
      case "Pending": return "outline"
      default: return "outline"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "destructive"
      case "Medium": return "secondary"
      case "Low": return "outline"
      default: return "outline"
    }
  }

  const completedTasks = tasks.filter(task => task.status === "Completed").length
  const totalTasks = tasks.length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
        <p className="text-muted-foreground">
          View and manage your assigned tasks
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((completedTasks / totalTasks) * 100)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>
            Your assigned tasks and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks assigned to you yet.
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Done</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <Checkbox
                      checked={task.status === "Completed"}
                      onCheckedChange={() => handleTaskComplete(task.id, task.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className={`font-medium ${task.status === "Completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </div>
                      <div className="text-sm text-muted-foreground">{task.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{task.deadline}</TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
