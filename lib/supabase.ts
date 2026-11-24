import { createBrowserClient } from '@supabase/ssr'
import { demoClient } from './demo/client'
import { isDemoMode } from './demo/mode'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** False when the env vars are missing — the login page shows a setup message instead of crashing. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.error('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
}

// Browser client. The session lives in cookies so middleware and API routes can read it.
// Row Level Security in the database decides what each signed-in user may see or change.
const realClient = createBrowserClient(
  supabaseUrl || 'https://not-configured.supabase.co',
  supabaseAnonKey || 'not-configured'
)

// In demo mode (see lib/demo) every call goes to a localStorage-backed stand-in, so
// visitors can try the app without an account and nothing is written to Supabase.
// The check runs on each property access, so entering/leaving the demo needs no reload.
export const supabase = new Proxy(realClient, {
  get(_target, prop) {
    const client: any = isDemoMode() ? demoClient : realClient
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// Types for our database
export interface Employee {
  id: string
  email: string
  name: string
  role: 'admin' | 'employee'
  is_verified: boolean
  created_at: string
  updated_at: string
  department?: string | null
  position?: string | null
  hire_date?: string | null
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
export type AssignmentStatus = 'Pending' | 'In Progress' | 'Completed'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'sick' | 'vacation' | 'remote'

export const ATTENDANCE_STATUSES: { value: AttendanceStatus; label: string; defaultHours: number }[] = [
  { value: 'present', label: 'Present', defaultHours: 8 },
  { value: 'late', label: 'Late', defaultHours: 8 },
  { value: 'half_day', label: 'Half Day', defaultHours: 4 },
  { value: 'remote', label: 'Remote', defaultHours: 8 },
  { value: 'absent', label: 'Absent', defaultHours: 0 },
  { value: 'sick', label: 'Sick', defaultHours: 0 },
  { value: 'vacation', label: 'Vacation', defaultHours: 0 },
]

export const attendanceLabel = (status: string) =>
  ATTENDANCE_STATUSES.find(s => s.value === status)?.label ?? status
