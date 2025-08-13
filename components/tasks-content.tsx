"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, MessageCircle, X, UserPlus, Loader2, CheckCircle, XCircle, Edit } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { supabase, type Employee } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface Task {
  id: string
  title: string
  description: string
  assigned_to: string[] // Array of employee IDs  
  assigned_names: string[] // Array of employee names
  deadline: string
  status: "Pending" | "In Progress" | "Completed"
  priority: "Low" | "Medium" | "High"
  created_by: string
  created_at: string
  updated_at: string
}

export function TasksContent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [availableEmployee, setAvailableEmployee] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
    priority: "Medium" as "Low" | "Medium" | "High"
  })
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast()

  // Database test function
  const testDatabaseConnection = async () => {
    try {
      console.log('🔍 Testing database connection...')
      
      // Test 1: Check if tables exist
      const { data: tables, error: tablesError } = await supabase
        .from('tasks')
        .select('count', { count: 'exact', head: true })
      
      if (tablesError) {
        console.error('❌ Tasks table error:', tablesError)
        toast({
          title: "Database Error",
          description: `Tasks table issue: ${tablesError.message}`,
          variant: "destructive"
        })
        return
      }
      
      console.log('✅ Tasks table exists, count:', tables)
      
      // Test 2: Check current user
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const user = JSON.parse(userStr)
        console.log('✅ Current user:', user)
        
        // Test 3: Try to insert a simple test record (then delete it)
        const testTask = {
          title: 'Test Task',
          description: 'Test Description',
          deadline: new Date().toISOString().split('T')[0],
          priority: 'Low',
          assigned_to: [],
          assigned_names: [],
          status: 'Pending',
          created_by: user.id
        }
        
        console.log('🔍 Testing task insertion with:', testTask)
        
        const { data: insertData, error: insertError } = await supabase
          .from('tasks')
          .insert([testTask])
          .select()
          .single()
        
        if (insertError) {
          console.error('❌ Insert test failed:', insertError)
          toast({
            title: "Insert Test Failed",
            description: `Error: ${insertError.message}`,
            variant: "destructive"
          })
        } else {
          console.log('✅ Insert test successful:', insertData)
          
          // Clean up - delete the test task
          await supabase.from('tasks').delete().eq('id', insertData.id)
          console.log('✅ Test task cleaned up')
          
          toast({
            title: "Database Test Successful",
            description: "Task creation should work now!",
          })
        }
      }
      
    } catch (error) {
      console.error('❌ Database test error:', error)
      toast({
        title: "Database Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadEmployees()
    loadTasks()
  }, [])

  const loadEmployees = async () => {
    try {
      console.log('🔍 Loading employees for task assignment...')
      const { data: employeesData, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_verified', true)
        .neq('role', 'admin')
        .order('name')

      if (error) {
        console.error('❌ Error loading employees for tasks:', error)
        toast({
          title: "Error",
          description: "Failed to load employees",
          variant: "destructive"
        })
        return
      }
      
      console.log('✅ Loaded employees for tasks:', employeesData?.length || 0)
      if (!employeesData || employeesData.length === 0) {
        console.log('⚠️ No verified employees found for task assignment')
      }
      setEmployees(employeesData || [])
    } catch (error) {
      console.error('❌ Exception loading employees:', error)
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      })
    }
  }

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(tasksData || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addEmployee = () => {
    if (availableEmployee && !selectedEmployees.includes(availableEmployee)) {
      setSelectedEmployees([...selectedEmployees, availableEmployee])
      setAvailableEmployee("")
    }
  }

  const removeEmployee = (employeeToRemove: string) => {
    setSelectedEmployees(selectedEmployees.filter(emp => emp !== employeeToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one employee",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('🔍 Creating task with employees:', selectedEmployees)
      
      // Get selected employee names
      const selectedEmployeeNames = employees
        .filter(emp => selectedEmployees.includes(emp.id))
        .map(emp => emp.name)

      console.log('🔍 Selected employees:', selectedEmployeeNames)
      
      const taskData = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline,
        priority: formData.priority,
        assigned_to: selectedEmployees,
        assigned_names: selectedEmployeeNames,
        status: "Pending",
        created_by: "admin" // Simple admin identifier
      }
      
      console.log('🔍 Task data to insert:', taskData)

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('❌ Task creation error:', error)
        throw error
      }

      console.log('✅ Task created:', data)

      await loadTasks() // Reload tasks
      setIsDialogOpen(false)
      setFormData({ title: "", description: "", deadline: "", priority: "Medium" })
      setSelectedEmployees([])
      setAvailableEmployee("")
      
      toast({
        title: "Task Assigned",
        description: `Task "${formData.title}" assigned to ${selectedEmployees.length} employee(s)`,
      })
    } catch (error) {
      console.error('❌ Full error creating task:', error)
      
      toast({
        title: "Task Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: "Pending" | "In Progress" | "Completed") => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) throw error

      // Also update all task assignments for this task
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .update({ 
          status: newStatus,
          completed_at: newStatus === "Completed" ? new Date().toISOString() : null
        })
        .eq('task_id', taskId)

      if (assignmentError) {
        console.warn('Assignment update warning:', assignmentError)
      }

      await loadTasks() // Reload tasks
      toast({
        title: "Success",
        description: `Task marked as ${newStatus.toLowerCase()}`,
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      })
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      await loadTasks() // Reload tasks
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive"
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

  // Trimmed search term for reliable matching/highlighting
  const trimmedSearchTerm = searchTerm.trim();
  const filteredTasks = tasks.filter(task =>
    trimmedSearchTerm === "" ? true : task.title.toLowerCase().includes(trimmedSearchTerm.toLowerCase())
  );

  // Highlight helper for title only
  function highlightText(text: string) {
    if (!trimmedSearchTerm) return text;
    const regex = new RegExp(`(${trimmedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <span key={i} style={{ background: '#fde68a', color: '#b45309', borderRadius: '2px', padding: '0 2px', border: '1px solid #b45309' }}>{part}</span>
        : part
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tasks</h2>
          <p className="text-muted-foreground">
            Assign and manage tasks for your team
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={testDatabaseConnection}
          >
            Test DB
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Task
          </Button>
        </div>
      </div>

      {/* Create Task Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Create New Task</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Create and assign a task to one or more employees
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm md:text-base">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="text-sm md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm md:text-base">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                  className="text-sm md:text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm md:text-base">Assign To Employees</Label>
                
                {/* Selected Employees Display */}
                {selectedEmployees.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm text-muted-foreground">Selected Employees:</Label>
                    <div className="flex flex-wrap gap-1 md:gap-2">
                      {selectedEmployees.map((employeeName) => (
                        <Badge key={employeeName} variant="outline" className="flex items-center gap-1 text-xs md:text-sm bg-gray-50 text-gray-700 border-gray-300">
                          {employeeName}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-3 w-3 md:h-4 md:w-4 p-0 hover:bg-gray-200"
                            onClick={() => removeEmployee(employeeName)}
                          >
                            <X className="h-2 w-2 md:h-3 md:w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add Employee Section */}
                <div className="flex gap-2">
                  <Select value={availableEmployee} onValueChange={setAvailableEmployee}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select employee to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter(employee => !selectedEmployees.includes(employee.name))
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.name}>
                            {employee.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEmployee}
                    disabled={!availableEmployee}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value: "Low" | "Medium" | "High") => setFormData({...formData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>
            All assigned tasks and their current status
          </CardDescription>
          <div className="flex gap-2 items-center mt-2">
            <input
              type="text"
              placeholder="Search task title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin mr-2" />
                      Loading tasks...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No tasks assigned yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{highlightText(task.title)}</div>
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {task.assigned_names.map((employeeName, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                            {employeeName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(task.deadline).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={getPriorityColor(task.priority)} className="font-medium">
                        {task.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(task.status)} className="font-medium">
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {task.status !== "Completed" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, "Completed")}
                            title="Mark as Completed"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {task.status === "Pending" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, "In Progress")}
                            title="Mark as In Progress"
                          >
                            <Edit className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteTask(task.id)}
                          title="Delete Task"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
