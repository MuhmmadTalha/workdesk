import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Client-side Supabase client (uses anon key with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (uses service role key, bypasses RLS)
// Only use this in API routes with proper authentication validation
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.warn('⚠️ Service role key not found - using anon key (development mode)')
    return supabase
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Types for our database
export interface Employee {
  id: string
  email: string
  name: string
  role: 'admin' | 'employee'
  is_verified: boolean
  created_at: string
  updated_at: string
  department?: string
  position?: string
  hire_date?: string
}

export interface VerificationRequest {
  id: string
  employee_id: string
  requested_by: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  notes?: string
}
