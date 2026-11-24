import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseAdminClient, getCallingAdminId } from '@/lib/supabase-server'

// Account management for admins. Runs on the server with the service role key,
// after confirming the caller is a signed-in, active admin.

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(72)

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(255),
  password: passwordSchema,
  role: z.enum(['admin', 'employee']).default('employee'),
  department: z.string().trim().max(100).optional().default(''),
  position: z.string().trim().max(100).optional().default(''),
})

const updateSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().toLowerCase().email().optional(),
  name: z.string().trim().min(1).max(255).optional(),
  role: z.enum(['admin', 'employee']).optional(),
  department: z.string().trim().max(100).nullable().optional(),
  position: z.string().trim().max(100).nullable().optional(),
  password: passwordSchema.optional(),
  active: z.boolean().optional(),
})

const forbidden = () => NextResponse.json({ error: 'Admins only' }, { status: 403 })
const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 })

function friendlyAuthError(message: string) {
  if (/already been registered|already exists|duplicate/i.test(message)) {
    return 'An account with this email already exists'
  }
  return message
}

// Create an employee account with a temporary password.
export async function POST(request: Request) {
  const adminId = await getCallingAdminId()
  if (!adminId) return forbidden()

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { email, name, password, role, department, position } = parsed.data

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, department, position },
    app_metadata: { role },
  })
  if (error || !data.user) return badRequest(friendlyAuthError(error?.message ?? 'Could not create user'))

  // The database trigger created the employees row; make sure role/details are exact.
  const { data: employee, error: updateError } = await admin
    .from('employees')
    .update({ name, role, department: department || null, position: position || null, is_verified: true })
    .eq('id', data.user.id)
    .select()
    .single()

  if (updateError) return badRequest(updateError.message)
  return NextResponse.json({ employee }, { status: 201 })
}

// Edit details, reset password, change role, or activate/deactivate.
export async function PATCH(request: Request) {
  const adminId = await getCallingAdminId()
  if (!adminId) return forbidden()

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid input')
  const { id, email, password, active, ...profile } = parsed.data

  if (id === adminId && (active === false || profile.role === 'employee')) {
    return badRequest('You cannot deactivate or demote your own account')
  }

  const admin = createSupabaseAdminClient()

  const authUpdate: { email?: string; password?: string; email_confirm?: boolean; ban_duration?: string } = {}
  if (email) { authUpdate.email = email; authUpdate.email_confirm = true }
  if (password) authUpdate.password = password
  if (active !== undefined) authUpdate.ban_duration = active ? 'none' : '876000h' // ~100 years

  if (Object.keys(authUpdate).length > 0) {
    const { error } = await admin.auth.admin.updateUserById(id, authUpdate)
    if (error) return badRequest(friendlyAuthError(error.message))
  }

  const employeeUpdate: Record<string, unknown> = { ...profile }
  if (email) employeeUpdate.email = email
  if (active !== undefined) employeeUpdate.is_verified = active

  if (Object.keys(employeeUpdate).length > 0) {
    const { error } = await admin.from('employees').update(employeeUpdate).eq('id', id)
    if (error) return badRequest(error.message)
  }

  return NextResponse.json({ ok: true })
}

// Permanently delete an account (and, by cascade, its notes/attendance/etc.).
export async function DELETE(request: Request) {
  const adminId = await getCallingAdminId()
  if (!adminId) return forbidden()

  const id = new URL(request.url).searchParams.get('id')
  if (!id || !z.string().uuid().safeParse(id).success) return badRequest('Missing employee id')
  if (id === adminId) return badRequest('You cannot delete your own account')

  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return badRequest(error.message)

  return NextResponse.json({ ok: true })
}
