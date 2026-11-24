"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from '@/lib/supabase'
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, UserPlus, CheckCircle, XCircle, Search, Filter, Check, ClipboardList, CalendarDays, Flag, Pencil, Clock3, Circle, Archive, ArchiveRestore, Download, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Reorder, SortableItem, DragHandle, HandleZone, sortValueAt, reorderIds } from '@/components/sortable-list'
import { Switch } from "@/components/ui/switch"
import { downloadCsv, csvDateTime, csvDateStamp } from '@/lib/csv'
import { InitialsAvatar } from '@/components/initials-avatar'
import { EmptyState, SectionSkeleton, Pill, statusTone, priorityTone } from '@/components/feedback-states'
import { useToast } from "@/hooks/use-toast"
import { formatDate } from '@/lib/date-utils'
import { splitForHighlight, localDateString } from '@/lib/utils'
import type { TaskStatus } from '@/lib/supabase'

interface TaskRow {
  id: string
  title: string
  description: string | null
  deadline: string | null
  status: TaskStatus
  priority: string
  created_at: string
  completed_at: string | null
  admin_sort_order: number
  admin_archived_at: string | null
  task_assignments: {
    employee_id: string
    status: string
    assigned_at: string
    completed_at: string | null
    employees: { name: string } | null
  }[]
}

interface EmployeeOption {
  id: string
  name: string
  email: string
}

const priorityStripe: Record<string, string> = {
  Low: 'bg-muted-foreground/30',
  Medium: 'bg-info',
  High: 'bg-warning',
  Critical: 'bg-destructive',
}

const assigneeNames = (task: TaskRow) =>
  task.task_assignments.map(a => a.employees?.name || 'Former employee')

// Per-assignee status badge shown on each avatar (every state is visible, not just Completed).
const ASSIGNEE_STATUS: Record<string, { icon: typeof Check; className: string; label: string }> = {
  Completed: { icon: Check, className: 'bg-success text-success-foreground', label: 'done' },
  'In Progress': { icon: Clock3, className: 'bg-warning text-warning-foreground', label: 'in progress' },
  Pending: { icon: Circle, className: 'bg-muted text-muted-foreground border border-border', label: 'pending' },
}

/** "2 done · 1 in progress · 1 pending" (zero counts hidden). */
const statusSummary = (task: TaskRow) => {
  const counts = new Map<string, number>()
  for (const a of task.task_assignments) counts.set(a.status, (counts.get(a.status) ?? 0) + 1)
  return ['Completed', 'In Progress', 'Pending']
    .filter(s => counts.get(s))
    .map(s => `${counts.get(s)} ${ASSIGNEE_STATUS[s].label}`)
    .join(' · ')
}

const emptyForm = { title: "", description: "", deadline: "", priority: "Medium" }

export function SimpleTasksContent() {
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilter, setSearchFilter] = useState("title") // title, employee, due, priority
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [availableEmployee, setAvailableEmployee] = useState("")
  const [formData, setFormData] = useState(emptyForm)
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  // While dragging: the on-screen order of task ids (null = use the saved order).
  const [dragOrder, setDragOrderState] = useState<string[] | null>(null)
  // Ref copy so the drag-end handler always sees the latest order.
  const dragOrderRef = useRef<string[] | null>(null)
  const setDragOrder = (ids: string[] | null) => { dragOrderRef.current = ids; setDragOrderState(ids) }
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<TaskRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const openCreate = () => {
    setEditingTask(null)
    setFormData(emptyForm)
    setSelectedEmployees([])
    setAvailableEmployee("")
    setIsDialogOpen(true)
  }

  const openEdit = (task: TaskRow) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description ?? "",
      deadline: task.deadline ?? "",
      priority: task.priority,
    })
    setSelectedEmployees(task.task_assignments.map(a => a.employee_id))
    setAvailableEmployee("")
    setIsDialogOpen(true)
  }

  const onDialogChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) setEditingTask(null)
  }

  // Name lookup that also covers assignees who are no longer in the active employee list.
  const nameFor = (id: string) =>
    employees.find(e => e.id === id)?.name ??
    editingTask?.task_assignments.find(a => a.employee_id === id)?.employees?.name ??
    'Former employee'

  useEffect(() => {
    loadData()
  }, [])

  useLiveRefresh(["tasks", "task_assignments", "employees"], () => loadData(true))

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      
      // Load employees (only employees, not admins)
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('role', 'employee')  // Only load employees for assignment
        .eq('is_verified', true)
        .order('name')

      if (empError) {
        toast({
          title: "Error",
          description: "Failed to load employees: " + empError.message,
          variant: "destructive"
        })
      } else {
        setEmployees(empData || [])
      }

      // Load tasks with their assignees (task_assignments is the single source of truth)
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, description, deadline, status, priority, created_at, completed_at, admin_sort_order, admin_archived_at, task_assignments(employee_id, status, assigned_at, completed_at, employees(name))')
        .order('admin_sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (taskError) {
        toast({
          title: "Error", 
          description: "Failed to load tasks: " + taskError.message,
          variant: "destructive"
        })
      } else {
        setTasks((taskData as unknown as TaskRow[]) || [])
      }

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

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error

      await loadData() // Reload tasks
      toast({
        title: "Success",
        description: `Task marked as ${newStatus.toLowerCase()}`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      })
    }
  }

  /**
   * Save `id` at its place in `ids` (the order on screen). Only the moved task is
   * written: it gets a sort value halfway between its new neighbours.
   */
  const placeTask = async (ids: string[], id: string) => {
    const byId = new Map(tasks.map(t => [t.id, t]))
    const index = ids.indexOf(id)
    const orders = ids.map(x => byId.get(x)?.admin_sort_order ?? 0)
    const newOrder = sortValueAt(orders, index)
    if (byId.get(id)?.admin_sort_order === newOrder || index < 0) { setDragOrder(null); return }
    setTasks(prev => prev
      .map(t => t.id === id ? { ...t, admin_sort_order: newOrder } : t)
      .sort((x, y) => x.admin_sort_order - y.admin_sort_order))
    setDragOrder(null)
    const { error } = await supabase.from('tasks').update({ admin_sort_order: newOrder }).eq('id', id)
    if (error) {
      toast({ title: "Error", description: `Failed to move task: ${error.message}`, variant: "destructive" })
      loadData(true)
    }
  }

  const deleteTask = async () => {
    if (!taskToDelete) return
    setDeleting(true)
    // Assignments are removed with it (on delete cascade), so it disappears for everyone.
    const { error } = await supabase.from('tasks').delete().eq('id', taskToDelete.id)
    setDeleting(false)
    if (error) {
      toast({ title: "Error", description: `Failed to delete task: ${error.message}`, variant: "destructive" })
      return
    }
    setTasks(prev => prev.filter(t => t.id !== taskToDelete.id))
    toast({ title: "Task deleted", description: `"${taskToDelete.title}" was removed for everyone.` })
    setTaskToDelete(null)
    loadData(true)
  }

  const setArchived = async (task: TaskRow, archived: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ admin_archived_at: archived ? new Date().toISOString() : null })
      .eq('id', task.id)
    if (error) {
      toast({ title: "Error", description: `Failed to ${archived ? 'archive' : 'unarchive'} task: ${error.message}`, variant: "destructive" })
      return
    }
    toast({
      title: archived ? "Task archived" : "Task restored",
      description: archived ? `"${task.title}" is hidden from your list. Assignees still see it.` : `"${task.title}" is back in your list.`,
    })
    loadData(true)
  }

  const exportCsv = () => {
    const headers = ['Task', 'Priority', 'Deadline', 'Task status', 'Task created', 'Task completed at',
      'Employee', 'Employee status', 'Assigned at', 'Employee completed at', 'Archived']
    const rows: string[][] = []
    for (const t of tasks) {
      const base = [t.title, t.priority, t.deadline ?? '', t.status, csvDateTime(t.created_at), csvDateTime(t.completed_at)]
      const archived = t.admin_archived_at ? 'Yes' : 'No'
      if (t.task_assignments.length === 0) {
        rows.push([...base, '', '', '', '', archived])
      } else {
        for (const a of t.task_assignments) {
          rows.push([...base, a.employees?.name || 'Former employee', a.status,
            csvDateTime(a.assigned_at), csvDateTime(a.completed_at), archived])
        }
      }
    }
    downloadCsv(`tasks_${csvDateStamp()}.csv`, headers, rows)
  }

  const saveEditedTask = async (task: TaskRow) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          deadline: formData.deadline || null,
          priority: formData.priority,
        })
        .eq('id', task.id)
      if (error) throw error

      // Diff assignees: existing people keep their own progress.
      const before = new Set(task.task_assignments.map(a => a.employee_id))
      const after = new Set(selectedEmployees)
      const added = selectedEmployees.filter(id => !before.has(id))
      const removed = [...before].filter(id => !after.has(id))

      if (added.length) {
        const { error: addError } = await supabase
          .from('task_assignments')
          .insert(added.map(employee_id => ({ task_id: task.id, employee_id })))
        if (addError) throw addError
      }
      if (removed.length) {
        const { error: removeError } = await supabase
          .from('task_assignments')
          .delete()
          .eq('task_id', task.id)
          .in('employee_id', removed)
        if (removeError) throw removeError
      }

      toast({ title: "Task updated", description: "Assignees have been notified." })
      onDialogChange(false)
      loadData(true)
    } catch (error) {
      const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error'
      toast({ title: "Error", description: `Failed to update task: ${message}`, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const saveTask = () => {
    if (!formData.title.trim() || selectedEmployees.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in title and assign to at least one employee",
        variant: "destructive"
      })
      return
    }
    return editingTask ? saveEditedTask(editingTask) : createTask()
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
      // created_by is filled in by the database (auth.uid()).
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          deadline: formData.deadline || null,
          priority: formData.priority,
          status: 'Pending',
        })
        .select('id')
        .single()

      if (error || !task) {
        toast({
          title: "Error",
          description: "Failed to create task: " + (error?.message ?? 'unknown error'),
          variant: "destructive"
        })
      } else {
        const { error: assignmentError } = await supabase
          .from('task_assignments')
          .insert(selectedEmployees.map(empId => ({ task_id: task.id, employee_id: empId })))

        if (assignmentError) {
          // Don't leave an orphan task nobody can see.
          await supabase.from('tasks').delete().eq('id', task.id)
          toast({
            title: "Error",
            description: "Failed to assign task: " + assignmentError.message,
            variant: "destructive"
          })
          return
        }

        toast({
          title: "Success",
          description: `Task assigned to ${selectedEmployees.length} employee(s)!`,
        })
        
        // Reset form and close dialog
        setFormData(emptyForm)
        setSelectedEmployees([])
        setAvailableEmployee("")
        onDialogChange(false)
        
        // Reload tasks
        loadData()
      }

    } catch (error) {
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
      <SectionSkeleton rows={5} label="Loading tasks" />
    )
  }

  const today = localDateString()
  // Filter tasks based on search query and filter type
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const archivedCount = tasks.filter(t => t.admin_archived_at).length
  const viewTasks = tasks.filter(t => showArchived ? !!t.admin_archived_at : !t.admin_archived_at)
  let filteredTasks = viewTasks;
  if (trimmedQuery) {
    if (searchFilter === "title") {
      filteredTasks = viewTasks.filter(task => task.title.toLowerCase().includes(trimmedQuery));
    } else if (searchFilter === "employee") {
      filteredTasks = viewTasks.filter(task => assigneeNames(task).some(name => name.toLowerCase().includes(trimmedQuery)));
    } else if (searchFilter === "due") {
      filteredTasks = viewTasks.filter(task => (task.deadline || "").toLowerCase().includes(trimmedQuery));
    } else if (searchFilter === "priority") {
      filteredTasks = viewTasks.filter(task => (task.priority || "").toLowerCase().includes(trimmedQuery));
    }
  }
  // Highlight helper for title only
  function highlightText(text: string) {
    if (!trimmedQuery || searchFilter !== "title") return text;
    return splitForHighlight(text, trimmedQuery).map((part, i) =>
      part.match
        ? <mark key={i} className="bg-warning-soft text-warning-soft-foreground rounded px-0.5">{part.text}</mark>
        : <span key={i}>{part.text}</span>
    );
  }

  // What's on screen: the saved order, or the live order while a task is being dragged.
  const filteredIds = filteredTasks.map(t => t.id)
  const shownIds = dragOrder && dragOrder.length === filteredIds.length && dragOrder.every(id => filteredIds.includes(id))
    ? dragOrder
    : filteredIds
  const shownTasks = shownIds.map(id => filteredTasks.find(t => t.id === id)!).filter(Boolean)

  return (
    <div className="space-y-6">
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => { if (!open && !deleting) setTaskToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{taskToDelete?.title}&rdquo; and every assignee&apos;s progress on it will be permanently removed.
              It will no longer appear in anyone&apos;s list, charts or exports. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep task</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); deleteTask() }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete task'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and assign tasks to your team
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex items-center w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" aria-hidden="true" />
            <Input
              aria-label="Search tasks"
              placeholder={`Search by ${searchFilter === 'title' ? 'title' : searchFilter === 'employee' ? 'employee' : searchFilter === 'due' ? 'due date' : 'priority'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 w-full"
              style={{ paddingRight: '2.5rem' }}
            />
            {/* Filter button inside input, like eye icon for password */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center h-full z-10">
              <Select value={searchFilter} onValueChange={setSearchFilter}>
                <SelectTrigger aria-label="Search filter" className="bg-transparent border-none p-0 h-7 w-7 flex items-center justify-center cursor-pointer shadow-none [&>svg:last-child]:hidden">
                  <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </SelectTrigger>
                <SelectContent side="bottom" align="end" className="min-w-[120px]">
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="due">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={tasks.length === 0} className="w-full md:w-auto">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button onClick={openCreate} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create New Task
          </Button>
        </div>
      </div>

      {/* Create / Edit Task Modal */}
      <Dialog open={isDialogOpen} onOpenChange={onDialogChange}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              {editingTask
                ? 'Change the details or assignees. Each assignee keeps their own progress.'
                : 'Create and assign a task to one or more employees'}
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
                    <SelectItem value="Critical">Critical</SelectItem>
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
                      const name = nameFor(employeeId)
                      return (
                        <div key={employeeId} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border">
                          {name}
                          <button
                            type="button"
                            aria-label={`Remove ${name}`}
                            className="ml-1 -mr-1 grid size-5 cursor-pointer place-items-center rounded-full outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => removeEmployee(employeeId)}
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
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
                  size="icon"
                  onClick={addEmployee}
                  disabled={!availableEmployee}
                  aria-label="Add selected employee"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
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
            <Button onClick={saveTask} disabled={saving} className="w-full">
              {editingTask ? (saving ? 'Saving…' : 'Save Changes') : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{showArchived ? 'Archived Tasks' : 'All Tasks'} ({filteredTasks.length})</CardTitle>
              <CardDescription className="mt-1.5">
                {showArchived
                  ? 'Hidden from your list only. Assignees still see these tasks.'
                  : `${employees.length} employees available for assignment`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="admin-show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="admin-show-archived" className="cursor-pointer text-sm font-normal">
                Show archived{archivedCount > 0 ? ` (${archivedCount})` : ''}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            showArchived && !searchQuery ? (
              <EmptyState icon={Archive} title="No archived tasks" description="Tasks you archive show up here." />
            ) : searchQuery ? (
              <EmptyState icon={Search} title="No matching tasks" description="Try a different search term or filter." />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No tasks yet"
                description="Create a task and assign it to your team."
                action={<Button size="sm" onClick={openCreate}><Plus aria-hidden="true" />Create task</Button>}
              />
            )
          ) : (
            <Reorder.Group axis="y" values={shownIds} onReorder={setDragOrder} as="div" className="space-y-3">
              {shownTasks.map((task, index) => {
                const closed = task.status === "Completed" || task.status === "Cancelled"
                const overdue = !closed && !!task.deadline && task.deadline < today
                return (
                <SortableItem
                  key={task.id}
                  id={task.id}
                  onDragStart={() => { setDraggingId(task.id); setDragOrder(shownIds) }}
                  onDragEnd={() => { const ids = dragOrderRef.current ?? shownIds; setDraggingId(null); placeTask(ids, task.id) }}
                  className={`overflow-hidden rounded-lg border bg-card p-4 pl-12 transition-colors duration-150 hover:bg-muted/40 ${closed && draggingId !== task.id ? 'opacity-75' : ''}`}
                >
                  {(controls, dragging) => (<>
                  <span className={`absolute inset-y-0 left-0 w-1 ${priorityStripe[task.priority] ?? 'bg-muted-foreground/30'}`} aria-hidden="true" />
                  {/* Left corner: hovering here reveals the move handle. */}
                  <HandleZone className="absolute inset-y-0 left-0 w-11 pl-2.5 pt-3.5">
                    <DragHandle
                      controls={controls}
                      title={task.title}
                      priority={task.priority}
                      isFirst={index === 0}
                      isLast={index === shownTasks.length - 1}
                      active={dragging}
                      onMoveTo={(target) => placeTask(reorderIds(shownIds, task.id, target), task.id)}
                    />
                  </HandleZone>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-base font-semibold ${task.status === 'Cancelled' ? 'line-through text-muted-foreground' : ''}`}>{highlightText(task.title)}</h3>
                        <Pill className={statusTone[task.status] ?? statusTone.Pending}>{task.status}</Pill>
                      </div>
                      {task.description && <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Pill className={priorityTone[task.priority] ?? priorityTone.Low}>
                          <Flag aria-hidden="true" />{task.priority}
                        </Pill>
                        {task.deadline && (
                          <Pill className={overdue ? 'bg-danger-soft text-danger-soft-foreground border-destructive/25' : 'bg-muted text-foreground border-border'}>
                            <CalendarDays aria-hidden="true" />
                            {overdue ? 'Overdue · ' : 'Due '}{formatDate(task.deadline)}
                          </Pill>
                        )}
                        <span className="text-xs text-muted-foreground">Created {formatDate(task.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:flex-col md:items-end md:justify-start">
                      {task.task_assignments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {task.task_assignments.slice(0, 4).map(a => {
                              const name = a.employees?.name || 'Former employee'
                              const meta = ASSIGNEE_STATUS[a.status] ?? ASSIGNEE_STATUS.Pending
                              const StatusIcon = meta.icon
                              return (
                                <span key={a.employee_id} className="relative">
                                  <InitialsAvatar name={name} size="sm" title={`${name}: ${a.status}`} className="ring-2 ring-card" />
                                  <span
                                    role="img"
                                    aria-label={`${name}: ${a.status}`}
                                    title={`${name}: ${a.status}`}
                                    className={`absolute -bottom-0.5 -right-0.5 grid size-3.5 place-items-center rounded-full ring-2 ring-card ${meta.className}`}
                                  >
                                    <StatusIcon className={a.status === 'Pending' ? 'size-1.5 fill-current' : 'size-2.5'} aria-hidden="true" />
                                  </span>
                                </span>
                              )
                            })}
                            {task.task_assignments.length > 4 && (
                              <span className="grid size-7 place-items-center rounded-full bg-muted text-[11px] font-medium ring-2 ring-card">+{task.task_assignments.length - 4}</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {task.task_assignments.length === 1
                              ? `${task.task_assignments[0].employees?.name || 'Former employee'} · ${ASSIGNEE_STATUS[task.task_assignments[0].status]?.label ?? 'pending'}`
                              : statusSummary(task)}
                          </span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setArchived(task, !task.admin_archived_at)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`${task.admin_archived_at ? 'Unarchive' : 'Archive'} "${task.title}"`}>
                          {task.admin_archived_at
                            ? <><ArchiveRestore aria-hidden="true" />Unarchive</>
                            : <><Archive aria-hidden="true" />Archive</>}
                        </Button>
                      {task.status !== 'Cancelled' && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(task)}
                            className="text-muted-foreground hover:text-foreground" aria-label={`Edit "${task.title}"`}>
                            <Pencil aria-hidden="true" />Edit
                          </Button>
                          {!closed && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, "Cancelled")}
                                className="text-muted-foreground hover:bg-danger-soft hover:text-destructive" aria-label={`Cancel "${task.title}"`}>
                                <XCircle aria-hidden="true" />Cancel
                              </Button>
                              <Button size="sm" onClick={() => updateTaskStatus(task.id, "Completed")} aria-label={`Mark "${task.title}" as completed`}>
                                <CheckCircle aria-hidden="true" />Complete
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                        <Button size="icon" variant="ghost" onClick={() => setTaskToDelete(task)}
                          className="size-8 text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                          aria-label={`Delete "${task.title}"`} title="Delete for everyone">
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  </>)}
                </SortableItem>
                )
              })}
            </Reorder.Group>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
