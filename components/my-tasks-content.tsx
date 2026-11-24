"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { supabase, type AssignmentStatus } from "@/lib/supabase"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, ListTodo, Percent, CalendarDays, Archive, ArchiveRestore, Download } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, Pill, priorityTone, statusTone } from "@/components/feedback-states"
import { formatDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { StatCard } from "@/components/stat-card"
import { downloadCsv, csvDateTime, csvDateStamp } from "@/lib/csv"
import { Reorder, SortableItem, DragHandle, HandleZone, sortValueAt, reorderIds } from "@/components/sortable-list"
import type { DragControls } from "framer-motion"

interface MyTask {
  id: string
  title: string
  description: string | null
  deadline: string | null
  priority: string
  taskStatus: string          // overall status set by the admin (e.g. Cancelled)
  status: AssignmentStatus    // this employee's own progress
  assignedAt: string
  completedAt: string | null  // when this employee marked it done
  sortOrder: number           // this employee's own ordering
  archivedAt: string | null   // archived by this employee only
}

interface MyTasksContentProps {
  userId: string
}

export function MyTasksContent({ userId }: MyTasksContentProps) {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  // While dragging: the on-screen order of task ids (null = use the saved order).
  const [dragOrder, setDragOrderState] = useState<string[] | null>(null)
  const dragOrderRef = useRef<string[] | null>(null)
  const setDragOrder = (ids: string[] | null) => { dragOrderRef.current = ids; setDragOrderState(ids) }
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data, error } = await supabase
      .from('task_assignments')
      .select('status, assigned_at, completed_at, sort_order, archived_at, tasks!inner(id, title, description, deadline, priority, status)')
      .eq('employee_id', userId)
      .order('sort_order', { ascending: true })
      .order('assigned_at', { ascending: false })

    if (error) {
      toast({ title: "Error", description: "Failed to load tasks. Please try again.", variant: "destructive" })
      setTasks([])
    } else {
      type Row = {
        status: AssignmentStatus
        assigned_at: string
        completed_at: string | null
        sort_order: number
        archived_at: string | null
        tasks: { id: string; title: string; description: string | null; deadline: string | null; priority: string; status: string }
      }
      setTasks(((data ?? []) as unknown as Row[]).map(row => ({
        id: row.tasks.id,
        title: row.tasks.title,
        description: row.tasks.description,
        deadline: row.tasks.deadline,
        priority: row.tasks.priority,
        taskStatus: row.tasks.status,
        status: row.status,
        assignedAt: row.assigned_at,
        completedAt: row.completed_at,
        sortOrder: row.sort_order,
        archivedAt: row.archived_at,
      })))
    }
    setLoading(false)
  }, [userId, toast])

  useEffect(() => {
    if (userId) fetchTasks()
  }, [userId, fetchTasks])

  useLiveRefresh(["task_assignments", "tasks"], () => fetchTasks(true), !!userId)

  /** Updates only this employee's own assignment row for a task. */
  const updateMine = (taskId: string, values: Record<string, unknown>) =>
    supabase.from('task_assignments').update(values).eq('task_id', taskId).eq('employee_id', userId)

  const setStatus = async (taskId: string, newStatus: AssignmentStatus) => {
    // Only this employee's assignment row changes, so co-assignees keep their own status.
    const completedAt = newStatus === "Completed" ? new Date().toISOString() : null
    const { error } = await updateMine(taskId, { status: newStatus, completed_at: completedAt })

    if (error) {
      toast({ title: "Error", description: "Failed to update task status. Please try again.", variant: "destructive" })
      return
    }

    setTasks(prev => prev.map(task => task.id === taskId ? { ...task, status: newStatus, completedAt } : task))
    toast({ title: "Success", description: `Task marked as ${newStatus.toLowerCase()}` })
  }

  /**
   * Save `id` at its place in `ids` (the order on screen). Only this employee's
   * row for the moved task is written: halfway between its new neighbours.
   */
  const placeTask = async (ids: string[], id: string) => {
    const byId = new Map(tasks.map(t => [t.id, t]))
    const index = ids.indexOf(id)
    const newOrder = sortValueAt(ids.map(x => byId.get(x)?.sortOrder ?? 0), index)
    setDragOrder(null)
    if (index < 0 || byId.get(id)?.sortOrder === newOrder) return
    setTasks(prev => prev
      .map(t => t.id === id ? { ...t, sortOrder: newOrder } : t)
      .sort((x, y) => x.sortOrder - y.sortOrder))
    const { error } = await updateMine(id, { sort_order: newOrder })
    if (error) {
      toast({ title: "Error", description: "Failed to move task. Please try again.", variant: "destructive" })
      fetchTasks(true)
    }
  }

  const setArchived = async (task: MyTask, archived: boolean) => {
    const { error } = await updateMine(task.id, { archived_at: archived ? new Date().toISOString() : null })
    if (error) {
      toast({ title: "Error", description: `Failed to ${archived ? 'archive' : 'unarchive'} task. Please try again.`, variant: "destructive" })
      return
    }
    toast({
      title: archived ? "Task archived" : "Task restored",
      description: archived ? `"${task.title}" is hidden from your list.` : `"${task.title}" is back in your list.`,
    })
    fetchTasks(true)
  }

  const exportCsv = () => {
    const headers = ["Task", "Priority", "Deadline", "Task status", "My status", "Assigned at", "Completed at", "Archived"]
    const rows = tasks.map(t => [
      t.title,
      t.priority,
      t.deadline ?? "",
      t.taskStatus,
      t.status,
      csvDateTime(t.assignedAt),
      csvDateTime(t.completedAt),
      t.archivedAt ? "Yes" : "No",
    ])
    downloadCsv(`my_tasks_${csvDateStamp()}.csv`, headers, rows)
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

  const archivedCount = tasks.filter(t => t.archivedAt).length
  const visibleTasks = tasks.filter(t => showArchived ? !!t.archivedAt : !t.archivedAt)

  const visibleIds = visibleTasks.map(t => t.id)
  const shownIds = dragOrder && dragOrder.length === visibleIds.length && dragOrder.every(id => visibleIds.includes(id))
    ? dragOrder
    : visibleIds
  const shownTasks = shownIds.map(id => visibleTasks.find(t => t.id === id)).filter((t): t is MyTask => !!t)

  const itemDragProps = (task: MyTask) => ({
    onDragStart: () => { setDraggingId(task.id); setDragOrder(shownIds) },
    onDragEnd: () => { const ids = dragOrderRef.current ?? shownIds; setDraggingId(null); placeTask(ids, task.id) },
  })

  const handle = (task: MyTask, index: number, controls: DragControls, dragging: boolean) => (
    <DragHandle
      controls={controls}
      title={task.title}
      priority={task.priority}
      isFirst={index === 0}
      isLast={index === shownTasks.length - 1}
      active={dragging}
      onMoveTo={(target) => placeTask(reorderIds(shownIds, task.id, target), task.id)}
    />
  )

  const archiveButton = (task: MyTask) => (
    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-foreground"
      onClick={() => setArchived(task, !task.archivedAt)}
      aria-label={`${task.archivedAt ? "Unarchive" : "Archive"} "${task.title}"`}
      title={task.archivedAt ? "Unarchive" : "Archive"}>
      {task.archivedAt ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
    </Button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage your assigned tasks</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={tasks.length === 0} className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Assigned" value={totalTasks} icon={ListTodo} tone="info" />
        <StatCard label="Completed" value={completedTasks} icon={CheckCircle} tone="success" />
        <StatCard label="Completion" value={`${completionRate}%`} icon={Percent} tone="brand" empty={totalTasks === 0} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{showArchived ? "Archived Tasks" : "Task List"}</CardTitle>
              <CardDescription className="mt-1.5">
                {showArchived ? "Tasks you archived. Your admin still sees them." : "Your assigned tasks and your progress on each"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="my-show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
              <Label htmlFor="my-show-archived" className="cursor-pointer text-sm font-normal">
                Show archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Loading tasks…</span>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : visibleTasks.length === 0 ? (
            showArchived
              ? <EmptyState icon={Archive} title="No archived tasks" description="Tasks you archive show up here." />
              : <EmptyState icon={ListTodo} title="No tasks yet" description="Tasks your admin assigns to you will show up here." />
          ) : (
            <>
            {/* Mobile: task cards */}
            <Reorder.Group axis="y" as="ul" values={shownIds} onReorder={setDragOrder} className="space-y-3 md:hidden">
              {shownTasks.map((task, index) => {
                const cancelled = task.taskStatus === "Cancelled"
                return (
                  <SortableItem key={task.id} id={task.id} as="li" {...itemDragProps(task)}
                    className={cn("rounded-lg border bg-card p-3", cancelled && draggingId !== task.id && "opacity-60")}>
                    {(controls, dragging) => (
                    <div className="flex items-start gap-2">
                      <HandleZone className="-ml-1">{handle(task, index, controls, dragging)}</HandleZone>
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
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          {statusSelect(task)}
                          {archiveButton(task)}
                        </div>
                      </div>
                    </div>
                    )}
                  </SortableItem>
                )
              })}
            </Reorder.Group>
            <div className="hidden w-full overflow-x-auto md:block">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"><span className="sr-only">Move</span></TableHead>
                    <TableHead className="w-12">Done</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16">Archive</TableHead>
                  </TableRow>
                </TableHeader>
                <Reorder.Group axis="y" as="tbody" values={shownIds} onReorder={setDragOrder} className="[&_tr:last-child]:border-0">
                  {shownTasks.map((task, index) => {
                    const cancelled = task.taskStatus === "Cancelled"
                    return (
                      <SortableItem key={task.id} id={task.id} as="tr" {...itemDragProps(task)}
                        className={cn("border-b bg-card transition-colors hover:bg-muted/50", cancelled && draggingId !== task.id && "opacity-60")}>
                        {(controls, dragging) => (<>
                        {/* Left corner: hovering this cell reveals the move handle. */}
                        <TableCell className="group/grip w-10 cursor-grab pr-0">{handle(task, index, controls, dragging)}</TableCell>
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
                        <TableCell>{archiveButton(task)}</TableCell>
                        </>)}
                      </SortableItem>
                    )
                  })}
                </Reorder.Group>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
