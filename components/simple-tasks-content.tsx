"use client"

import { useState, useEffect } from "react"
import { supabase } from '@/lib/supabase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, UserPlus, CheckCircle, XCircle, Search } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import { formatDate } from '@/lib/date-utils'

export function SimpleTasksContent() {
  const [tasks, setTasks] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [availableEmployee, setAvailableEmployee] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    deadline: "",
    priority: "Medium"
  })
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load employees (only employees, not admins)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('role', 'employee')  // Only load employees for assignment
      
      if (empError) {
        console.error('Error loading employees:', empError)
        toast({
          title: "Error",
          description: "Failed to load employees: " + empError.message,
          variant: "destructive"
        })
      } else {
        setEmployees(empData || [])
        console.log('Loaded employees:', empData)
      }

      // Load tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (taskError) {
        console.error('Error loading tasks:', taskError)
        toast({
          title: "Error", 
          description: "Failed to load tasks: " + taskError.message,
          variant: "destructive"
        })
      } else {
        setTasks(taskData || [])
        console.log('Loaded tasks:', taskData)
      }

    } catch (error) {
      console.error('Data loading error:', error)
    } finally {
      setLoading(false)
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

  const updateTaskStatus = async (taskId: string, newStatus: "Pending" | "In Progress" | "Completed" | "Cancelled") => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId)

      if (error) throw error

      await loadData() // Reload tasks
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

  const createTask = async () => {
    if (!formData.title || selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in title and assign to at least one employee",
        variant: "destructive"
      })
      return
    }

    try {
      // Get selected employee names
      const selectedEmployeeNames = employees
        .filter(emp => selectedEmployees.includes(emp.id))
        .map(emp => emp.name)
      
      const newTask = {
        title: formData.title,
        description: formData.description,
        deadline: formData.deadline || null,
        priority: formData.priority,
        assigned_to: selectedEmployees, // Array format
        assigned_names: selectedEmployeeNames, // Array format
        status: 'Pending',
        created_by: '11111111-1111-1111-1111-111111111111' // Admin user UUID from our setup
      }

      console.log('Creating task:', newTask)

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTask])
        .select()

      if (error) {
        console.error('Task creation error:', error)
        toast({
          title: "Error",
          description: "Failed to create task: " + error.message,
          variant: "destructive"
        })
      } else {
        console.log('Task created successfully:', data)
        
        // Also create task assignment records for each employee
        if (data && data[0]) {
          const assignments = selectedEmployees.map(empId => ({
            task_id: data[0].id,
            employee_id: empId
          }))
          
          const { error: assignmentError } = await supabase
            .from('task_assignments')
            .insert(assignments)
          
          if (assignmentError) {
            console.error('Task assignment error:', assignmentError)
          }
        }
        
        toast({
          title: "Success",
          description: `Task assigned to ${selectedEmployees.length} employee(s)!`,
        })
        
        // Reset form and close dialog
        setFormData({
          title: "",
          description: "",
          deadline: "",
          priority: "Medium"
        })
        setSelectedEmployees([])
        setAvailableEmployee("")
        setIsDialogOpen(false)
        
        // Reload tasks
        loadData()
      }

    } catch (error) {
      console.error('Task creation error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: "Error",
        description: `Failed to create task: ${errorMsg}`,
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div>Loading...</div>
      </div>
    )
  }

  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.assigned_names?.some((name: string) => name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tasks Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Create and assign tasks to your team
          </p>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:gap-2 md:space-y-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full md:w-64"
            />
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create New Task
          </Button>
        </div>
      </div>

      {/* Create Task Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">Create New Task</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              Create and assign a task to one or more employees
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter task title..."
                />
              </div>
              
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                />
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
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

            <div className="space-y-2">
              <Label className="text-sm md:text-base">Assign To Employees</Label>
              
              {/* Selected Employees Display */}
              {selectedEmployees.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs md:text-sm text-muted-foreground">Selected Employees:</Label>
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {selectedEmployees.map((employeeId) => {
                      const employee = employees.find(emp => emp.id === employeeId)
                      return (
                        <div key={employeeId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          {employee?.name}
                          <button
                            type="button"
                            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                            onClick={() => removeEmployee(employeeId)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
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
                      .filter(employee => !selectedEmployees.includes(employee.id))
                      .map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
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
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter task description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createTask} className="w-full">
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Tasks ({filteredTasks.length})</CardTitle>
          <CardDescription>
            {employees.length} employees available for assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div>Loading tasks...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No tasks found matching your search." : "No tasks found. Create your first task above."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          {task.priority} Priority
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          {task.status}
                        </span>
                        {task.deadline && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                            Due: {task.deadline}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end mt-4 md:mt-0 md:ml-4">
                      <div className="text-right mb-3">
                        <p className="text-sm font-medium">
                          Assigned to: {task.assigned_names?.join(', ') || 'Unassigned'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created: {formatDate(task.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {task.status !== "Completed" && task.status !== "Cancelled" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, "Completed")}
                            title="Mark as Completed"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {task.status !== "Cancelled" && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => updateTaskStatus(task.id, "Cancelled")}
                            title="Cancel Task"
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
