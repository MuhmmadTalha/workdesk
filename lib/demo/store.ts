// localStorage-backed "database" for demo mode. Nothing here ever reaches Supabase.
// Every read goes back to localStorage, so several tabs (e.g. admin in one, employee
// in another) always see the same data. Changes are broadcast to other tabs so their
// live views refresh, just like Supabase Realtime does for the real app.

export type Row = Record<string, any>
export type TableName =
  | "employees" | "tasks" | "task_assignments" | "attendance"
  | "performance_ratings" | "notes" | "notifications"

export type DemoDB = Record<TableName, Row[]>

export interface ChangeEvent {
  table: TableName
  eventType: "INSERT" | "UPDATE" | "DELETE"
  new: Row
  old: Row
}

const DB_KEY = "workdesk-demo-v1"
const SESSION_KEY = "workdesk-demo-session"

export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000001"
export const DEMO_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000002"
/** The two one-click accounts. They can't be deleted or deactivated in the demo. */
export const PROTECTED_DEMO_IDS = [DEMO_ADMIN_ID, DEMO_EMPLOYEE_ID]

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
      })

const pad = (n: number) => String(n).padStart(2, "0")
/** YYYY-MM-DD in the browser's time zone. */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** HH:MM:SS in the browser's time zone. */
export const localTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const daysFromNow = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}
const isoDaysAgo = (n: number, hour = 10) => {
  const d = daysFromNow(-n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Seed data (dates are relative to the day the demo is first opened)
// ---------------------------------------------------------------------------
function seed(): DemoDB {
  const hire = (daysAgo: number) => localDate(daysFromNow(-daysAgo))
  const emp = (id: string, name: string, email: string, role: "admin" | "employee", department: string, position: string, hiredDaysAgo: number): Row => ({
    id, name, email, role, is_verified: true, department, position,
    hire_date: hire(hiredDaysAgo), created_at: isoDaysAgo(hiredDaysAgo), updated_at: isoDaysAgo(hiredDaysAgo),
  })

  const PRIYA = uid(), DANIEL = uid(), LENA = uid(), OMAR = uid()
  const employees: Row[] = [
    emp(DEMO_ADMIN_ID, "Alex Morgan", "admin@workdesk.demo", "admin", "Operations", "Office Manager", 400),
    emp(DEMO_EMPLOYEE_ID, "Sam Rivera", "employee@workdesk.demo", "employee", "Engineering", "Frontend Developer", 220),
    emp(PRIYA, "Priya Shah", "priya@workdesk.demo", "employee", "Design", "Product Designer", 310),
    emp(DANIEL, "Daniel Kim", "daniel@workdesk.demo", "employee", "Marketing", "Content Strategist", 150),
    emp(LENA, "Lena Fischer", "lena@workdesk.demo", "employee", "Engineering", "Backend Developer", 90),
    emp(OMAR, "Omar Haddad", "omar@workdesk.demo", "employee", "Sales", "Account Executive", 45),
  ]

  const tasks: Row[] = []
  const task_assignments: Row[] = []
  const addTask = (
    title: string, description: string, priority: string, deadlineIn: number | null,
    createdDaysAgo: number, status: string, assignees: [string, string][],
  ) => {
    const id = uid()
    tasks.push({
      id, title, description, priority, status,
      deadline: deadlineIn === null ? null : localDate(daysFromNow(deadlineIn)),
      created_by: DEMO_ADMIN_ID, created_at: isoDaysAgo(createdDaysAgo), updated_at: isoDaysAgo(createdDaysAgo),
    })
    for (const [employee_id, s] of assignees) {
      task_assignments.push({
        id: uid(), task_id: id, employee_id, status: s,
        assigned_at: isoDaysAgo(createdDaysAgo),
        completed_at: s === "Completed" ? isoDaysAgo(Math.max(0, createdDaysAgo - 2), 16) : null,
      })
    }
  }
  addTask("Build the new onboarding checklist page", "Turn the Figma onboarding flow into a responsive page with progress saving.", "High", 3, 2, "In Progress",
    [[DEMO_EMPLOYEE_ID, "In Progress"], [PRIYA, "Completed"]])
  addTask("Fix date picker on mobile Safari", "The attendance date picker opens off-screen on iOS 17.", "Critical", 1, 1, "Pending",
    [[DEMO_EMPLOYEE_ID, "Pending"]])
  addTask("Write Q4 product newsletter", "Highlight the three biggest releases of the quarter.", "Medium", 6, 3, "In Progress",
    [[DANIEL, "In Progress"]])
  addTask("Rate-limit the public API", "Add per-key limits and return 429 with Retry-After.", "High", 5, 4, "Pending",
    [[LENA, "Pending"]])
  addTask("Refresh the pricing page illustrations", "", "Low", 12, 5, "Pending",
    [[PRIYA, "Pending"]])
  addTask("Prepare demo for Northwind renewal", "Tailor the demo to their reporting needs.", "High", -1, 9, "Completed",
    [[OMAR, "Completed"]])
  addTask("Migrate attendance export to CSV", "Admins asked for a CSV export instead of PDF.", "Medium", -3, 12, "Completed",
    [[DEMO_EMPLOYEE_ID, "Completed"], [LENA, "Completed"]])
  addTask("Plan team offsite agenda", "Cancelled — offsite moved to next quarter.", "Low", null, 14, "Cancelled",
    [[DANIEL, "Pending"]])

  // Attendance for the last 10 weekdays; deterministic so the charts look the same each reset.
  const attendance: Row[] = []
  const pattern = ["present", "present", "remote", "present", "late", "present", "present", "half_day", "present", "sick", "present", "vacation"]
  const staff = employees.filter(e => e.role === "employee")
  let weekday = 0
  for (let back = 1; weekday < 10 && back < 20; back++) {
    const d = daysFromNow(-back)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    weekday++
    staff.forEach((e, i) => {
      const status = pattern[(back * 3 + i * 5) % pattern.length]
      const working = ["present", "late", "remote", "half_day"].includes(status)
      const inH = status === "late" ? 10 : 9
      const hours = status === "half_day" ? 4 : working ? 8 : 0
      attendance.push({
        id: uid(), employee_id: e.id, date: localDate(d), status, hours_worked: hours,
        check_in_time: working ? `${pad(inH)}:${pad((i * 7) % 30)}:00` : null,
        check_out_time: working ? `${pad(inH + hours)}:${pad((i * 7) % 30)}:00` : null,
        notes: status === "sick" ? "Called in sick" : null, created_at: d.toISOString(),
      })
    })
  }
  // Today: a few people have already checked in (the demo employee hasn't, so they can try it).
  const today = localDate()
  const nowDay = new Date().getDay()
  if (nowDay !== 0 && nowDay !== 6) {
    ;[[PRIYA, "present", "08:52:00"], [LENA, "remote", "09:05:00"], [OMAR, "late", "10:14:00"]].forEach(([employee_id, status, t]) =>
      attendance.push({ id: uid(), employee_id, date: today, status, hours_worked: 0, check_in_time: t, check_out_time: null, notes: null, created_at: new Date().toISOString() }))
  }

  const q = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
  const rate = (employee_id: string, rating: number, feedback: string, daysAgo: number): Row =>
    ({ id: uid(), employee_id, rating, feedback, period: q, rated_by: DEMO_ADMIN_ID, created_at: isoDaysAgo(daysAgo) })
  const performance_ratings: Row[] = [
    rate(DEMO_EMPLOYEE_ID, 5, "Shipped the CSV export ahead of schedule and documented it well.", 4),
    rate(DEMO_EMPLOYEE_ID, 4, "Solid sprint. Keep pairing with design earlier on.", 30),
    rate(PRIYA, 5, "Onboarding designs were excellent.", 6),
    rate(DANIEL, 3, "Good ideas; deadlines slipped twice.", 10),
    rate(LENA, 4, "Reliable and thorough code reviews.", 8),
    rate(OMAR, 5, "Closed the Northwind renewal.", 2),
  ]

  const notes: Row[] = [
    { id: uid(), employee_id: DEMO_EMPLOYEE_ID, content: "Ask Priya for the final onboarding icons before Thursday.", created_at: isoDaysAgo(1), updated_at: isoDaysAgo(1) },
    { id: uid(), employee_id: DEMO_EMPLOYEE_ID, content: "Safari bug repro: iPhone 15, Settings → Text Size largest.", created_at: isoDaysAgo(0, 9), updated_at: isoDaysAgo(0, 9) },
    { id: uid(), employee_id: DEMO_ADMIN_ID, content: "Review Q4 ratings with each team lead next week.", created_at: isoDaysAgo(2), updated_at: isoDaysAgo(2) },
  ]

  const note = (recipient_id: string, type: string, title: string, body: string, link_tab: string, hoursAgo: number, read = false): Row => {
    const d = new Date(Date.now() - hoursAgo * 3600_000).toISOString()
    return { id: uid(), recipient_id, type, title, body, link_tab, read_at: read ? d : null, created_at: d }
  }
  const notifications: Row[] = [
    note(DEMO_EMPLOYEE_ID, "task_assigned", "New task: Fix date picker on mobile Safari", "Critical priority", "tasks", 20),
    note(DEMO_EMPLOYEE_ID, "rating_added", "New performance rating: 5/5", `${q} · "Shipped the CSV export ahead of schedule…"`, "performance", 90, true),
    note(DEMO_ADMIN_ID, "task_completed", "Priya Shah completed a task", "Build the new onboarding checklist page", "tasks", 5),
    note(DEMO_ADMIN_ID, "task_completed", "Omar Haddad completed a task", "Prepare demo for Northwind renewal", "tasks", 30, true),
  ]

  return { employees, tasks, task_assignments, attendance, performance_ratings, notes, notifications }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
export function readDB(): DemoDB {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw) as DemoDB
  } catch {
    // Corrupt or unavailable storage: fall through and reseed.
  }
  const fresh = seed()
  writeDB(fresh)
  return fresh
}

export function writeDB(db: DemoDB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Storage full or blocked (private mode) — the demo keeps working for this page view only.
  }
}

/** Throw away every change and start from fresh sample data. */
export function resetDemo() {
  writeDB(seed())
  emitReset()
}

// The signed-in demo user. sessionStorage first, so two tabs can be signed in as
// different roles; localStorage as a fallback for newly opened tabs.
export function getSessionUserId(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY)
}
export function setSessionUserId(id: string | null) {
  if (id) {
    sessionStorage.setItem(SESSION_KEY, id)
    localStorage.setItem(SESSION_KEY, id)
  } else {
    sessionStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY)
  }
}

// ---------------------------------------------------------------------------
// Change events (this tab + other tabs)
// ---------------------------------------------------------------------------
type Listener = (e: ChangeEvent) => void
const listeners = new Set<Listener>()
let bc: BroadcastChannel | null = null

function channel() {
  if (!bc && typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel("workdesk-demo")
    bc.onmessage = (msg) => {
      const data = msg.data as ChangeEvent | { reset: true }
      if ("reset" in data) dispatchReset()
      else listeners.forEach(l => l(data))
    }
  }
  return bc
}

export function onChange(listener: Listener) {
  channel()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function emit(e: ChangeEvent) {
  listeners.forEach(l => l(e))
  channel()?.postMessage(e)
}

// A reset touches every table: tell every subscriber to reload.
function dispatchReset() {
  const tables: TableName[] = ["employees", "tasks", "task_assignments", "attendance", "performance_ratings", "notes", "notifications"]
  tables.forEach(table => listeners.forEach(l => l({ table, eventType: "UPDATE", new: {}, old: {} })))
}
function emitReset() {
  dispatchReset()
  channel()?.postMessage({ reset: true })
}
