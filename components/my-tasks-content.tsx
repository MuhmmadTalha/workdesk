"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, type AssignmentStatus } from "@/lib/supabase"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, ListTodo, Percent, CalendarDays } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, Pill, priorityTone, statusTone } from "@/components/feedback-states"
import { formatDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { StatCard } from "@/components/stat-card"

interface MyTask {
  id: string
  title: string
  description: string | null
  deadline: string | null
  priority: string
  taskStatus: string          // overall status set by the admin (e.g. Cancelled)
  status: AssignmentStatus    // this employee's own progress
}

interface MyTasksContentProps {
  userId: string
}

export function MyTasksContent({ userId }: MyTasksContentProps) {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('status, assigned_at, tasks!inner(id, title, description, deadline, priority, status)')
      .eq('employee_id', userId)
      .order('assigned_at', { ascending: false })

    if (error) {
      toast({ title: "Error", description: "Failed to load tasks. Please try again.", variant: "destructive" })
      setTasks([])
    } else {
      type Row = { status: AssignmentStatus; tasks: { id: string; title: string; description: string | null; deadline: string | null; priority: string; status: string } }
      setTasks(((data ?? []) as unknown as Row[]).map(row => ({
        id: row.tasks.id,
        title: row.tasks.title,
        description: row.tasks.description,
        deadline: row.tasks.deadline,
        priority: row.tasks.priority,
        taskStatus: row.tasks.status,
        status: row.status,
      })))
    }
    setLoading(false)
  }, [userId, toast])

  useEffect(() => {
    if (userId) fetchTasks()
  }, [userId, fetchTasks])

  useLiveRefresh(["task_assignments", "tasks"], () => fetchTasks(true), !!userId)

  const setStatus = async (taskId: string, newStatus: AssignmentStatus) => {
    // Only this employee's assignment row changes, so co-assignees keep their own status.
    const { error } = await supabase
      .from('task_assignments')
      .update({
        status: newStatus,
        completed_at: newStatus === "Completed" ? new Date().toISOString() : null,
      })
      .eq('task_id', taskId)
      .eq('employee_id', userId)

    if (error) {
      toast({ title: "Error", description: "Failed to update task status. Please try again.", variant: "destructive" })
      return
    }

    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: newStatus } : task))
    toast({ title: "Success", description: `Task marked as ${newStatus.toLowerCase()}` })
  }

  const statusSelect = (task: MyTask) =>
    task.taskStatus === "Cancelled" ? (
      <Pill className={statusTone.Cancelled}>Cancelled</Pill>
    ) : (
      <Select value={task.status} onValueChange={(v) => setStatus(task.id, v as AssignmentStatus)}>
        <SelectTrigger className="h-9 w-[140px]" aria-label={`Status for ${task.title}`}>
          <SelectValue>
            <Pill className={statusTone[task.status] ?? statusTone.Pending}>{task.status}</Pill>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="In Progress">In Progress</SelectItem>
          <SelectItem value="Completed">Completed</SelectItem>
        </SelectContent>
      </Select>
    )

  const doneCheckbox = (task: MyTask) => (
    <Checkbox
      className="size-5"
      aria-label={`Mark "${task.title}" as ${task.status === "Completed" ? "not done" : "done"}`}
      disabled={task.taskStatus === "Cancelled"}
      checked={task.status === "Completed"}
      onCheckedChange={() => setStatus(task.id, task.status === "Completed" ? "Pending" : "Completed")}
    />
  )

  const activeTasks = tasks.filter(t => t.taskStatus !== "Cancelled")
  const completedTasks = activeTasks.filter(task => task.status === "Completed").length
  const totalTasks = activeTasks.length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">View and manage your assigned tasks</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Assigned" value={totalTasks} icon={ListTodo} tone="info" />
        <StatCard label="Completed" value={completedTasks} icon={CheckCircle} tone="success" />
        <StatCard label="Completion" value={`${completionRate}%`} icon={Percent} tone="brand" empty={totalTasks === 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>Your assigned tasks and your progress on each</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Loading tasks…</span>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={ListTodo} title="No tasks yet" description="Tasks your admin assigns to you will show up here." />
          ) : (
            <>
            {/* Mobile: task cards */}
            <ul className="space-y-3 md:hidden">
              {tasks.map((task) => {
                const cancelled = task.taskStatus === "Cancelled"
                return (
                  <li key={task.id} className={cn("rounded-lg border p-3", cancelled && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">{doneCheckbox(task)}</div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", (task.status === "Completed" || cancelled) && "line-through text-muted-foreground")}>
                          {task.title}
                        </p>
                        {task.description && <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Pill className={priorityTone[task.priority] ?? priorityTone.Low}>{task.priority}</Pill>
                          {task.deadline && (
                            <Pill className="bg-muted text-foreground border-border">
                              <CalendarDays aria-hidden="true" />{formatDate(task.deadline)}
                            </Pill>
                          )}
                        </div>
                        <div className="mt-3">{statusSelect(task)}</div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="hidden w-full overflow-x-auto md:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Done</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const cancelled = task.taskStatus === "Cancelled"
                    return (
                      <TableRow key={task.id} className={cancelled ? "opacity-60" : ""}>
                        <TableCell>{doneCheckbox(task)}</TableCell>
                        <TableCell>
                          <div className={`font-medium ${task.status === "Completed" || cancelled ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </div>
                          {task.description && <div className="text-sm text-muted-foreground">{task.description}</div>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">{task.deadline ? formatDate(task.deadline) : "—"}</TableCell>
                        <TableCell>
                          <Pill className={priorityTone[task.priority] ?? priorityTone.Low}>{task.priority}</Pill>
                        </TableCell>
                        <TableCell>{statusSelect(task)}</TableCell>
                      </TableRow>
                    )
                  })}
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
