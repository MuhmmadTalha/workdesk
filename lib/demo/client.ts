// A small stand-in for the Supabase browser client, backed by lib/demo/store.ts.
// It covers exactly what this app's components use: select (with nested embeds),
// eq/neq/in/gte/lte/is, order, limit, single/maybeSingle, insert/update/upsert/delete,
// the check_in/check_out RPCs, auth, and realtime channels. It also replays the
// database triggers from supabase/*.sql so notifications behave like production.

import {
  readDB, writeDB, emit, onChange, uid, localDate, localTime,
  getSessionUserId, setSessionUserId, PROTECTED_DEMO_IDS,
  type DemoDB, type Row, type TableName, type ChangeEvent,
} from "./store"

type PgError = { message: string; code?: string; details?: string; hint?: string }
type Result<T = any> = { data: T; error: PgError | null; count: null; status: number; statusText: string }

const ok = <T,>(data: T, status = 200): Result<T> => ({ data, error: null, count: null, status, statusText: "OK" })
const fail = (message: string, code = "DEMO", status = 400): Result<null> =>
  ({ data: null, error: { message, code }, count: null, status, statusText: "Error" })

// Column defaults (mirror supabase/schema.sql).
const quarter = () => `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
const DEFAULTS: Record<TableName, () => Row> = {
  employees: () => ({ role: "employee", is_verified: true, department: null, position: null, hire_date: localDate(), updated_at: new Date().toISOString() }),
  notes: () => ({ employee_id: getSessionUserId(), updated_at: new Date().toISOString() }),
  tasks: () => ({ description: null, deadline: null, status: "Pending", priority: "Medium", created_by: getSessionUserId(), updated_at: new Date().toISOString(), completed_at: null, admin_sort_order: -Date.now() / 1000, admin_archived_at: null }),
  task_assignments: () => ({ status: "Pending", assigned_at: new Date().toISOString(), completed_at: null, sort_order: -Date.now() / 1000, archived_at: null }),
  attendance: () => ({ status: "present", hours_worked: 0, check_in_time: null, check_out_time: null, notes: null }),
  performance_ratings: () => ({ period: quarter(), feedback: null, rated_by: getSessionUserId() }),
  notifications: () => ({ read_at: null }),
}
const UNIQUE: Partial<Record<TableName, string[][]>> = {
  employees: [["email"]],
  task_assignments: [["task_id", "employee_id"]],
  attendance: [["employee_id", "date"]],
}
const HAS_UPDATED_AT = new Set<TableName>(["employees", "notes", "tasks"])

// ---------------------------------------------------------------------------
// "Row Level Security": what the signed-in demo user can read.
// ---------------------------------------------------------------------------
function visible(db: DemoDB, table: TableName, row: Row): boolean {
  const me = getSessionUserId()
  if (!me) return false
  if (table === "notifications") return row.recipient_id === me
  if (table === "notes") return row.employee_id === me
  const isAdmin = db.employees.some(e => e.id === me && e.role === "admin" && e.is_verified)
  if (isAdmin) return true
  switch (table) {
    case "employees": return row.id === me
    case "task_assignments":
    case "attendance":
    case "performance_ratings": return row.employee_id === me
    case "tasks": return db.task_assignments.some(a => a.task_id === row.id && a.employee_id === me)
    default: return false
  }
}

// ---------------------------------------------------------------------------
// select("a, b, rel!hint(c, d, nested(e))") parsing + embedding
// ---------------------------------------------------------------------------
type Field = { kind: "col"; name: string } | { kind: "star" } | { kind: "embed"; rel: string; hint?: string; fields: Field[] }

function splitTopLevel(s: string): string[] {
  const out: string[] = []
  let depth = 0, cur = ""
  for (const ch of s) {
    if (ch === "(") depth++
    if (ch === ")") depth--
    if (ch === "," && depth === 0) { out.push(cur); cur = "" } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map(p => p.trim()).filter(Boolean)
}

function parseSelect(cols: string): Field[] {
  return splitTopLevel(cols.replace(/\s+/g, " ")).map((part): Field => {
    if (part === "*") return { kind: "star" }
    const m = part.match(/^(?:\w+:)?(\w+)(?:!(\w+))?\s*\((.*)\)$/)
    if (m) return { kind: "embed", rel: m[1], hint: m[2], fields: parseSelect(m[3]) }
    return { kind: "col", name: part.replace(/^\w+:/, "") }
  })
}

const singular = (t: string) => t.replace(/s$/, "")

/** Resolve a foreign-key relationship the way PostgREST would for this schema. */
function embed(db: DemoDB, from: TableName, row: Row, rel: TableName, hint: string | undefined): Row | Row[] | null {
  const target = db[rel] ?? []
  // Explicit FK hint, e.g. employees!performance_ratings_rated_by_fkey → rated_by
  const hinted = hint && hint !== "inner" ? hint.match(new RegExp(`^${from}_(\\w+)_fkey$`))?.[1] : undefined
  const fk = hinted ?? `${singular(rel)}_id`
  if (fk in row) return target.find(r => r.id === row[fk]) ?? null
  const back = `${singular(from)}_id`
  return target.filter(r => r[back] === row.id)
}

function project(db: DemoDB, table: TableName, row: Row, fields: Field[]): Row | null {
  const out: Row = {}
  for (const f of fields) {
    if (f.kind === "star") Object.assign(out, row)
    else if (f.kind === "col") out[f.name] = row[f.name] ?? null
    else {
      const rel = f.rel as TableName
      const found = embed(db, table, row, rel, f.hint)
      if (f.hint === "inner" && (found === null || (Array.isArray(found) && found.length === 0))) return null
      out[f.rel] = Array.isArray(found)
        ? found.map(r => project(db, rel, r, f.fields)).filter(Boolean)
        : found && project(db, rel, found, f.fields)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Triggers (port of supabase/002-*.sql, 003-*.sql and 005-*.sql)
// ---------------------------------------------------------------------------
const monDD = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit" })

function notify(db: DemoDB, recipient_id: string | null, type: string, title: string, body: string, link_tab: string, events: ChangeEvent[]) {
  if (!recipient_id) return
  const weekAgo = Date.now() - 7 * 864e5
  db.notifications = db.notifications.filter(n => new Date(n.created_at).getTime() >= weekAgo)
  const row = { id: uid(), recipient_id, type, title: title.slice(0, 200), body: body.slice(0, 500), link_tab, read_at: null, created_at: new Date().toISOString() }
  db.notifications.push(row)
  events.push({ table: "notifications", eventType: "INSERT", new: row, old: {} })
}

function runTriggers(db: DemoDB, table: TableName, op: "INSERT" | "UPDATE", next: Row, prev: Row | null, events: ChangeEvent[]) {
  const me = getSessionUserId()
  if (table === "task_assignments" && op === "INSERT") {
    const task = db.tasks.find(t => t.id === next.task_id)
    const priority = task?.priority ?? "Medium"
    notify(db, next.employee_id, "task_assigned", `New task: ${task?.title ?? "Untitled"}`,
      task?.deadline ? `${priority} priority · due ${monDD(task.deadline)}` : `${priority} priority`, "tasks", events)
  }
  if (table === "task_assignments" && op === "UPDATE" && next.status === "Completed" && prev?.status !== "Completed") {
    const title = db.tasks.find(t => t.id === next.task_id)?.title ?? "Untitled task"
    const name = db.employees.find(e => e.id === next.employee_id)?.name ?? "An employee"
    db.employees.filter(e => e.role === "admin" && e.is_verified).forEach(a =>
      notify(db, a.id, "task_completed", `${name} completed a task`, title, "tasks", events))
  }
  // 005: tasks.completed_at follows the status (a "before update" trigger in SQL).
  if (table === "tasks" && op === "UPDATE" && prev && next.status !== prev.status) {
    next.completed_at = next.status === "Completed" ? new Date().toISOString() : null
  }
  if (table === "tasks" && op === "UPDATE" && prev) {
    const assignees = db.task_assignments.filter(a => a.task_id === next.id).map(a => a.employee_id)
    if (next.status === "Cancelled" && prev.status !== "Cancelled") {
      assignees.forEach(id => notify(db, id, "task_cancelled", `Task cancelled: ${next.title}`, "You no longer need to work on this task.", "tasks", events))
    } else if (next.status !== "Cancelled") {
      const changes: string[] = []
      if (next.title !== prev.title) changes.push("title")
      if ((next.description ?? null) !== (prev.description ?? null)) changes.push("description")
      if ((next.deadline ?? null) !== (prev.deadline ?? null)) changes.push(next.deadline ? `due ${monDD(next.deadline)}` : "deadline removed")
      if (next.priority !== prev.priority) changes.push(`${next.priority} priority`)
      if (changes.length) assignees.forEach(id => notify(db, id, "task_updated", `Task updated: ${next.title}`, `Changed: ${changes.join(", ")}`, "tasks", events))
    }
  }
  if (table === "performance_ratings" && op === "INSERT") {
    const fb = next.feedback ? ` · "${next.feedback.slice(0, 80)}${next.feedback.length > 80 ? "…" : ""}"` : ""
    notify(db, next.employee_id, "rating_added", `New performance rating: ${next.rating}/5`, `${next.period ?? ""}${fb}`, "performance", events)
  }
  if (table === "attendance") {
    const isAdmin = db.employees.some(e => e.id === me && e.role === "admin")
    if (isAdmin && next.employee_id !== me) {
      notify(db, next.employee_id, "attendance_updated", `Attendance updated for ${monDD(next.date)}`,
        `Marked as ${String(next.status).replace(/_/g, " ")} · ${next.hours_worked} h`, "attendance", events)
    }
  }
}

function cascadeDelete(db: DemoDB, table: TableName, row: Row, events: ChangeEvent[]) {
  const drop = (t: TableName, match: (r: Row) => boolean) => {
    db[t] = db[t].filter(r => {
      if (!match(r)) return true
      events.push({ table: t, eventType: "DELETE", new: {}, old: r })
      return false
    })
  }
  if (table === "tasks") drop("task_assignments", r => r.task_id === row.id)
  if (table === "employees") {
    drop("task_assignments", r => r.employee_id === row.id)
    drop("attendance", r => r.employee_id === row.id)
    drop("performance_ratings", r => r.employee_id === row.id)
    drop("notes", r => r.employee_id === row.id)
    drop("notifications", r => r.recipient_id === row.id)
  }
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------
type Filter = (r: Row) => boolean
const cmp = (a: any, b: any) => (typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : a < b ? -1 : a > b ? 1 : 0)

class DemoQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select"
  private cols = "*"
  private returning: string | null = null
  private payload: Row[] = []
  private patch: Row = {}
  private onConflict?: string
  private filters: Filter[] = []
  private orders: { col: string; asc: boolean }[] = []
  private max?: number
  private mode: "many" | "single" | "maybe" = "many"

  constructor(private table: TableName) {}

  select(cols = "*") {
    if (this.op === "select") this.cols = cols
    else this.returning = cols
    return this
  }
  insert(rows: Row | Row[]) { this.op = "insert"; this.payload = Array.isArray(rows) ? rows : [rows]; return this }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert"; this.payload = Array.isArray(rows) ? rows : [rows]; this.onConflict = opts?.onConflict; return this
  }
  update(patch: Row) { this.op = "update"; this.patch = patch; return this }
  delete() { this.op = "delete"; return this }

  eq(c: string, v: any) { this.filters.push(r => r[c] === v); return this }
  neq(c: string, v: any) { this.filters.push(r => r[c] !== v); return this }
  in(c: string, vs: any[]) { this.filters.push(r => vs.includes(r[c])); return this }
  gt(c: string, v: any) { this.filters.push(r => r[c] > v); return this }
  gte(c: string, v: any) { this.filters.push(r => r[c] >= v); return this }
  lt(c: string, v: any) { this.filters.push(r => r[c] < v); return this }
  lte(c: string, v: any) { this.filters.push(r => r[c] <= v); return this }
  is(c: string, v: any) { this.filters.push(r => (r[c] ?? null) === v); return this }
  order(col: string, opts?: { ascending?: boolean }) { this.orders.push({ col, asc: opts?.ascending ?? true }); return this }
  limit(n: number) { this.max = n; return this }
  single() { this.mode = "single"; return this }
  maybeSingle() { this.mode = "maybe"; return this }

  then<A = Result, B = never>(onOk?: ((v: Result) => A | PromiseLike<A>) | null, onErr?: ((e: any) => B | PromiseLike<B>) | null) {
    return Promise.resolve()
      .then(() => this.run())
      .then(onOk, onErr)
  }

  private run(): Result {
    if (!getSessionUserId()) return fail("Not signed in to the demo", "42501", 401)
    const db = readDB()
    const t = this.table
    if (!db[t]) return fail(`relation "public.${t}" does not exist`, "42P01", 404)

    const events: ChangeEvent[] = []
    let rows: Row[]

    switch (this.op) {
      case "select":
        rows = db[t].filter(r => visible(db, t, r) && this.filters.every(f => f(r)))
        break

      case "insert":
      case "upsert": {
        rows = []
        const keys = this.onConflict ? [this.onConflict.split(",").map(s => s.trim())] : UNIQUE[t] ?? []
        for (const input of this.payload) {
          const now = new Date().toISOString()
          const existing = db[t].find(r => keys.some(k => k.every(c => r[c] === input[c])) || (input.id && r.id === input.id))
          if (existing) {
            if (this.op === "insert") return fail(`duplicate key value violates unique constraint on ${t}`, "23505", 409)
            const prev = { ...existing }
            Object.assign(existing, input, HAS_UPDATED_AT.has(t) ? { updated_at: now } : {})
            events.push({ table: t, eventType: "UPDATE", new: existing, old: prev })
            runTriggers(db, t, "UPDATE", existing, prev, events)
            rows.push(existing)
          } else {
            const row = { id: uid(), created_at: now, ...DEFAULTS[t](), ...input }
            db[t].push(row)
            events.push({ table: t, eventType: "INSERT", new: row, old: {} })
            runTriggers(db, t, "INSERT", row, null, events)
            rows.push(row)
          }
        }
        break
      }

      case "update": {
        rows = db[t].filter(r => this.filters.every(f => f(r)))
        for (const row of rows) {
          const prev = { ...row }
          Object.assign(row, this.patch, HAS_UPDATED_AT.has(t) ? { updated_at: new Date().toISOString() } : {})
          events.push({ table: t, eventType: "UPDATE", new: row, old: prev })
          runTriggers(db, t, "UPDATE", row, prev, events)
        }
        break
      }

      case "delete": {
        rows = db[t].filter(r => this.filters.every(f => f(r)))
        db[t] = db[t].filter(r => !rows.includes(r))
        for (const row of rows) {
          events.push({ table: t, eventType: "DELETE", new: {}, old: row })
          cascadeDelete(db, t, row, events)
        }
        break
      }
    }

    if (this.op !== "select") {
      writeDB(db)
      events.forEach(emit)
      if (this.returning === null) return ok(null, this.op === "insert" ? 201 : 204)
    }

    for (const { col, asc } of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => {
        const x = a[col] ?? null, y = b[col] ?? null
        if (x === y) return 0
        if (x === null) return asc ? 1 : -1
        if (y === null) return asc ? -1 : 1
        return asc ? cmp(x, y) : -cmp(x, y)
      })
    }

    const fields = parseSelect(this.op === "select" ? this.cols : this.returning || "*")
    let data = rows.map(r => project(db, t, r, fields)).filter((r): r is Row => r !== null)
    if (this.max !== undefined) data = data.slice(0, this.max)

    if (this.mode === "many") return ok(data)
    if (data.length === 1) return ok(data[0])
    if (data.length === 0 && this.mode === "maybe") return ok(null)
    return fail(`JSON object requested, multiple (or no) rows returned`, "PGRST116", 406)
  }
}

// ---------------------------------------------------------------------------
// RPCs
// ---------------------------------------------------------------------------
function rpc(fn: string): Result {
  const me = getSessionUserId()
  const db = readDB()
  if (!me || !db.employees.some(e => e.id === me && e.is_verified)) return fail("Not allowed", "42501", 403)
  const today = localDate()
  const now = localTime()
  const events: ChangeEvent[] = []
  let row = db.attendance.find(a => a.employee_id === me && a.date === today)

  if (fn === "check_in") {
    if (row) {
      const prev = { ...row }
      row.check_out_time = null
      row.check_in_time = row.check_in_time ?? now
      if (row.status === "absent") row.status = "present"
      events.push({ table: "attendance", eventType: "UPDATE", new: row, old: prev })
    } else {
      row = { id: uid(), employee_id: me, date: today, status: "present", check_in_time: now, check_out_time: null, hours_worked: 0, notes: null, created_at: new Date().toISOString() }
      db.attendance.push(row)
      events.push({ table: "attendance", eventType: "INSERT", new: row, old: {} })
    }
  } else if (fn === "check_out") {
    if (!row || !row.check_in_time) return fail("You have not checked in today", "P0001")
    const prev = { ...row }
    const secs = (t: string) => { const [h, m, s] = t.split(":").map(Number); return h * 3600 + m * 60 + (s || 0) }
    row.check_out_time = now
    row.hours_worked = Math.min(24, Math.max(0, Math.round(((secs(now) - secs(row.check_in_time)) / 3600) * 100) / 100))
    events.push({ table: "attendance", eventType: "UPDATE", new: row, old: prev })
  } else {
    return fail(`Could not find the function public.${fn}`, "PGRST202", 404)
  }

  writeDB(db)
  events.forEach(emit)
  return ok(row)
}

// ---------------------------------------------------------------------------
// Realtime channels
// ---------------------------------------------------------------------------
type ChangeOpts = { event: "*" | "INSERT" | "UPDATE" | "DELETE"; schema?: string; table?: string; filter?: string }

class DemoChannel {
  private handlers: { opts: ChangeOpts; cb: (payload: any) => void }[] = []
  private off?: () => void

  on(_type: string, opts: ChangeOpts, cb: (payload: any) => void) {
    this.handlers.push({ opts, cb })
    return this
  }

  subscribe(cb?: (status: string) => void) {
    this.off = onChange(e => {
      for (const { opts, cb } of this.handlers) {
        if (opts.table && opts.table !== e.table) continue
        if (opts.event !== "*" && opts.event !== e.eventType) continue
        const m = opts.filter?.match(/^(\w+)=eq\.(.+)$/)
        if (m && String((e.eventType === "DELETE" ? e.old : e.new)[m[1]]) !== m[2]) continue
        cb({ schema: "public", table: e.table, eventType: e.eventType, new: e.new, old: e.old, commit_timestamp: new Date().toISOString(), errors: null })
      }
    })
    cb?.("SUBSCRIBED")
    return this
  }

  unsubscribe() {
    this.off?.()
    return Promise.resolve("ok")
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
type AuthCb = (event: string, session: any) => void
const authListeners = new Set<AuthCb>()

function currentUser() {
  const id = getSessionUserId()
  if (!id) return null
  const e = readDB().employees.find(x => x.id === id)
  return e ? { id: e.id, email: e.email, app_metadata: { role: e.role }, user_metadata: { name: e.name } } : null
}

const auth = {
  getUser: async () => ({ data: { user: currentUser() }, error: null }),
  getSession: async () => {
    const user = currentUser()
    return { data: { session: user ? { user, access_token: "demo" } : null }, error: null }
  },
  signInWithPassword: async ({ email }: { email: string; password: string }) => {
    const e = readDB().employees.find(x => x.email === email.trim().toLowerCase())
    if (!e) return { data: { user: null, session: null }, error: { message: "Invalid login credentials" } }
    setSessionUserId(e.id)
    const user = currentUser()
    authListeners.forEach(cb => cb("SIGNED_IN", { user }))
    return { data: { user, session: { user } }, error: null }
  },
  signOut: async () => {
    setSessionUserId(null)
    authListeners.forEach(cb => cb("SIGNED_OUT", null))
    return { error: null }
  },
  updateUser: async () => ({ data: { user: null }, error: { message: "Password changes are turned off in the demo." } }),
  onAuthStateChange: (cb: AuthCb) => {
    authListeners.add(cb)
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } }
  },
}

// ---------------------------------------------------------------------------
// The client
// ---------------------------------------------------------------------------
export const demoClient = {
  from: (table: string) => new DemoQuery(table as TableName),
  rpc: async (fn: string, _args?: Record<string, unknown>) => rpc(fn),
  channel: (_name: string) => new DemoChannel(),
  removeChannel: async (ch: DemoChannel) => ch.unsubscribe(),
  auth,
}

// ---------------------------------------------------------------------------
// Stand-in for /api/admin/employees (which needs the service-role key on the server)
// ---------------------------------------------------------------------------
export async function demoAdminApi(method: "POST" | "PATCH" | "DELETE", body?: any, query = "") {
  const db = readDB()
  const me = getSessionUserId()
  if (!db.employees.some(e => e.id === me && e.role === "admin" && e.is_verified)) throw new Error("Admins only")
  const events: ChangeEvent[] = []

  if (method === "POST") {
    const email = String(body?.email ?? "").trim().toLowerCase()
    const name = String(body?.name ?? "").trim()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Invalid email")
    if (!name) throw new Error("Name is required")
    if (String(body?.password ?? "").length < 8) throw new Error("Password must be at least 8 characters")
    if (db.employees.some(e => e.email === email)) throw new Error("An account with this email already exists")
    const now = new Date().toISOString()
    const employee = {
      id: uid(), email, name, role: body?.role ?? "employee", is_verified: true,
      department: body?.department || null, position: body?.position || null,
      hire_date: localDate(), created_at: now, updated_at: now,
    }
    db.employees.push(employee)
    events.push({ table: "employees", eventType: "INSERT", new: employee, old: {} })
    writeDB(db)
    events.forEach(emit)
    return { employee }
  }

  if (method === "PATCH") {
    const { id, password: _pw, active, ...profile } = body ?? {}
    const row = db.employees.find(e => e.id === id)
    if (!row) throw new Error("Employee not found")
    if (PROTECTED_DEMO_IDS.includes(id) && (active === false || (profile.role && profile.role !== row.role) || (profile.email && profile.email !== row.email))) {
      throw new Error("The built-in demo accounts can't be deactivated, demoted or re-emailed. Try it on another employee.")
    }
    if (profile.email && db.employees.some(e => e.id !== id && e.email === String(profile.email).toLowerCase())) {
      throw new Error("An account with this email already exists")
    }
    const prev = { ...row }
    Object.assign(row, profile, active !== undefined ? { is_verified: active } : {}, { updated_at: new Date().toISOString() })
    events.push({ table: "employees", eventType: "UPDATE", new: row, old: prev })
    writeDB(db)
    events.forEach(emit)
    return { ok: true }
  }

  const id = new URLSearchParams(query.replace(/^\?/, "")).get("id")
  if (!id) throw new Error("Missing employee id")
  if (PROTECTED_DEMO_IDS.includes(id)) throw new Error("The built-in demo accounts can't be deleted. Try it on another employee.")
  const row = db.employees.find(e => e.id === id)
  if (!row) throw new Error("Employee not found")
  db.employees = db.employees.filter(e => e.id !== id)
  events.push({ table: "employees", eventType: "DELETE", new: {}, old: row })
  cascadeDelete(db, "employees", row, events)
  writeDB(db)
  events.forEach(emit)
  return { ok: true }
}
