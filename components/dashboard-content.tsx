'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ClipboardList, CheckCircle2, Star, PieChart as PieChartIcon, BarChart3, AlertTriangle, CalendarClock, UserCheck, PartyPopper } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { localDateString } from '@/lib/utils'
import { formatDate } from '@/lib/date-utils'
import { StatCard } from "@/components/stat-card"
import { PageHeader } from "@/components/page-header"
import { EmptyState, ErrorState, SectionSkeleton, Pill, priorityTone } from "@/components/feedback-states"

// Semantic tokens so the chart follows light/dark theme.
const STATUS_COLORS: Record<string, string> = {
  Completed: "var(--success)",
  "In Progress": "var(--warning)",
  Pending: "var(--info)",
  Cancelled: "var(--chart-5)",
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 }
const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
    boxShadow: "0 4px 16px rgb(0 0 0 / 0.08)",
  },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 500 },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)" },
}

interface TaskRow {
  id: string
  title: string
  status: string
  priority: string
  deadline: string | null
}

interface Overview {
  employees: number
  tasks: TaskRow[]
  ratingAvg: number | null
  ratingCount: number
  perEmployeeRating: { name: string; rating: number }[]
  workload: { employee: string; tasks: number }[]
  presentToday: number
}

const normalizeStatus = (s: string) =>
  ({ completed: "Completed", pending: "Pending", in_progress: "In Progress", cancelled: "Cancelled" } as Record<string, string>)[s] ?? s

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export function DashboardContent({ userName, onNavigate }: { userName?: string; onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const today = localDateString()
      const [emp, tasks, perf, assigns, att] = await Promise.all([
        supabase.from('employees').select('id, name, role'),
        supabase.from('tasks').select('id, title, status, priority, deadline'),
        supabase.from('performance_ratings').select('rating, employee_id'),
        supabase.from('task_assignments').select('employee_id'),
        supabase.from('attendance').select('employee_id, status').eq('date', today),
      ])
      const firstError = [emp, tasks, perf, assigns, att].find(r => r.error)?.error
      if (firstError) throw new Error(firstError.message)

      const people = emp.data ?? []
      const names = new Map(people.map(p => [p.id, p.name as string]))
      const ratings = perf.data ?? []

      const byEmp = new Map<string, number[]>()
      ratings.forEach(r => {
        const n = names.get(r.employee_id) ?? 'Unknown'
        byEmp.set(n, [...(byEmp.get(n) ?? []), r.rating])
      })

      const load = new Map<string, number>()
      ;(assigns.data ?? []).forEach(a => {
        const n = names.get(a.employee_id) ?? 'Former employee'
        load.set(n, (load.get(n) ?? 0) + 1)
      })

      setData({
        employees: people.filter(p => p.role !== 'admin').length,
        tasks: (tasks.data ?? []).map(t => ({ ...t, status: normalizeStatus(t.status) })),
        ratingAvg: ratings.length ? Math.round((ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length) * 10) / 10 : null,
        ratingCount: ratings.length,
        perEmployeeRating: [...byEmp.entries()]
          .map(([name, rs]) => ({ name, rating: Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 8),
        workload: [...load.entries()].map(([employee, tasks]) => ({ employee, tasks })).sort((a, b) => b.tasks - a.tasks).slice(0, 10),
        presentToday: (att.data ?? []).filter(a => ['present', 'late', 'half_day', 'remote'].includes(a.status)).length,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useLiveRefresh(["employees", "tasks", "task_assignments", "performance_ratings", "attendance"], () => load(true))

  if (loading && !data) return <SectionSkeleton stats={4} rows={4} label="Loading overview" />

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" />
        <Card className="py-0">
          <ErrorState title="Couldn't load the overview" message={error} onRetry={() => load()} />
        </Card>
      </div>
    )
  }

  const total = data.tasks.length
  const count = (s: string) => data.tasks.filter(t => t.status === s).length
  const completed = count("Completed")
  const pending = count("Pending")
  const open = data.tasks.filter(t => t.status === "Pending" || t.status === "In Progress")
  const completionRate = total ? Math.round((completed / total) * 100) : 0

  const statusData = ["Completed", "In Progress", "Pending", "Cancelled"]
    .map(name => ({ name, value: count(name), color: STATUS_COLORS[name] }))
    .filter(d => d.value > 0)

  const today = localDateString()
  const in3 = localDateString(new Date(Date.now() + 3 * 86_400_000))
  const overdue = open.filter(t => t.deadline && t.deadline < today)
  const dueSoon = open.filter(t => t.deadline && t.deadline >= today && t.deadline <= in3)
  const attention = [...overdue.map(t => ({ ...t, overdue: true })), ...dueSoon.map(t => ({ ...t, overdue: false }))]
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, 5)

  const rawFirst = userName?.split(/\s+/)[0]
  const firstName = rawFirst ? rawFirst[0].toUpperCase() + rawFirst.slice(1) : undefined
  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={todayLabel}
        title={firstName ? `${greeting()}, ${firstName}` : "Overview"}
        description="Here's how your team is doing today."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Employees" value={data.employees} icon={Users} tone="brand"
          hint={`${data.presentToday} checked in today`} onClick={onNavigate && (() => onNavigate("employees"))} />
        <StatCard label="Open tasks" value={open.length} icon={ClipboardList} tone="info"
          hint={`${pending} pending · ${total} total`} onClick={onNavigate && (() => onNavigate("tasks"))} />
        <StatCard label="Completion" value={`${completionRate}%`} icon={CheckCircle2} tone="success" empty={total === 0}
          hint={`${completed} of ${total} tasks done`} onClick={onNavigate && (() => onNavigate("tasks"))} />
        <StatCard label="Avg. rating" value={<>{data.ratingAvg}<span className="text-base font-normal text-muted-foreground"> / 5</span></>}
          icon={Star} tone="warning" empty={data.ratingAvg === null}
          hint={`${data.ratingCount} review${data.ratingCount === 1 ? '' : 's'}`} onClick={onNavigate && (() => onNavigate("performance"))} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Needs attention */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning-soft-foreground" aria-hidden="true" />
              Needs attention
            </CardTitle>
            <CardDescription>Overdue and due in the next 3 days</CardDescription>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <EmptyState icon={PartyPopper} title="All clear" description="Nothing overdue or due soon." className="py-6" />
            ) : (
              <ul className="divide-y">
                {attention.map(t => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={onNavigate && (() => onNavigate("tasks"))}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${t.overdue ? 'bg-danger-soft text-danger-soft-foreground' : 'bg-warning-soft text-warning-soft-foreground'}`}>
                        <CalendarClock className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{t.title}</span>
                        <span className={`block text-xs ${t.overdue ? 'text-danger-soft-foreground' : 'text-muted-foreground'}`}>
                          {t.overdue ? 'Overdue · was due ' : 'Due '}{formatDate(t.deadline!)}
                        </span>
                      </span>
                      <Pill className={priorityTone[t.priority] ?? priorityTone.Low}>{t.priority}</Pill>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Task status donut */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Task status</CardTitle>
            <CardDescription>All tasks by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-5">
                <div className="relative size-36 shrink-0" role="img" aria-label={`Task status: ${statusData.map(d => `${d.name} ${d.value}`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68}
                        paddingAngle={statusData.length > 1 ? 3 : 0} strokeWidth={0} cornerRadius={4}>
                        {statusData.map(d => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-hidden="true">
                    <div>
                      <div className="text-2xl font-semibold leading-none tabular-nums">{total}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">tasks</div>
                    </div>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2.5">
                  {statusData.map(d => (
                    <li key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{Math.round((d.value / total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyChart icon={PieChartIcon} text="No tasks yet" hint="Task status appears once tasks are created." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workload</CardTitle>
            <CardDescription>Tasks assigned to each person</CardDescription>
          </CardHeader>
          <CardContent>
            {data.workload.length > 0 ? (
              <HorizontalBars data={data.workload.map(w => ({ name: w.employee, value: w.tasks }))} name="Tasks" color="var(--brand)" />
            ) : (
              <EmptyChart icon={BarChart3} text="No assignments yet" hint="Assign tasks to see who is busy." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average rating</CardTitle>
            <CardDescription>Per employee, out of 5</CardDescription>
          </CardHeader>
          <CardContent>
            {data.perEmployeeRating.length > 0 ? (
              <HorizontalBars data={data.perEmployeeRating.map(r => ({ name: r.name, value: r.rating }))} name="Rating" color="var(--warning)" max={5} />
            ) : (
              <EmptyChart icon={UserCheck} text="No ratings yet" hint="Rate employees on the Performance tab." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/** Bar chart whose height follows the number of rows, so 1 item doesn't float in a tall empty chart. */
function HorizontalBars({ data, name, color, max }: { data: { name: string; value: number }[]; name: string; color: string; max?: number }) {
  const height = Math.max(96, data.length * 44 + 24)
  return (
    <div className="relative space-y-2">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" domain={[0, max ?? 'dataMax']} allowDecimals={!!max} tick={axisTick} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={96} tick={axisTick} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} />
          <Bar dataKey="value" name={name} fill={color} radius={[0, 6, 6, 0]} barSize={18} background={{ fill: "var(--muted)", radius: 6 }} />
        </BarChart>
      </ResponsiveContainer>
      <ul className="sr-only">
        {data.map(d => <li key={d.name}>{d.name}: {d.value}</li>)}
      </ul>
    </div>
  )
}

function EmptyChart({ text, hint, icon }: { text: string; hint?: string; icon?: React.ComponentProps<typeof EmptyState>["icon"] }) {
  return <EmptyState icon={icon} title={text} description={hint} className="rounded-lg border border-dashed py-8" />
}
