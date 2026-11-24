// Server-only Supabase helpers. Never import this file from a "use client" component:
// it reads SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level Security.
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Supabase client acting as the signed-in user (from the request cookies). */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a context where cookies are read-only; middleware refreshes them.
        }
      },
    },
  })
}

/** Admin client with the service role key. Only use after checking the caller is an admin. */
export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Returns the signed-in admin's id, or null if the caller is not an active admin. */
export async function getCallingAdminId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: employee } = await supabase
    .from('employees')
    .select('role, is_verified')
    .eq('id', user.id)
    .single()

  return employee?.role === 'admin' && employee.is_verified ? user.id : null
}
