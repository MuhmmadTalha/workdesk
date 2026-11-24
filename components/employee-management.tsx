"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, CheckCircle, Ban, Mail, Calendar, Building, Pencil, Trash2, Download, KeyRound, RefreshCw, Search, Users } from "lucide-react"
import { EmptyState, SectionSkeleton } from "@/components/feedback-states"
import { InitialsAvatar } from "@/components/initials-avatar"
import { supabase, type Employee } from "@/lib/supabase"
import { isDemoMode } from "@/lib/demo/mode"
import { demoAdminApi } from "@/lib/demo/client"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { useToast } from "@/hooks/use-toast"
import { splitForHighlight } from "@/lib/utils"
import { downloadCsv, csvDateStamp } from "@/lib/csv"

type Role = "admin" | "employee"

/** Calls the server-side admin API (service role key never reaches the browser). */
async function adminApi(method: "POST" | "PATCH" | "DELETE", body?: unknown, query = "") {
  if (isDemoMode()) return demoAdminApi(method, body, query)
  const res = await fetch(`/api/admin/employees${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

/** Random, readable temporary password (no ambiguous characters). */
function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const values = new Uint32Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, v => chars[v % chars.length]).join("")
}

export function EmployeeManagement({ currentUserId }: { currentUserId: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [employeeToReset, setEmployeeToReset] = useState<Employee | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEmployees()
  }, [])

  useLiveRefresh(["employees"], () => loadEmployees(true))

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return employees
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [employees, searchTerm])

  const highlight = (text: string) =>
    splitForHighlight(text, searchTerm).map((part, i) =>
      part.match
        ? <mark key={i} className="bg-warning-soft text-warning-soft-foreground rounded px-0.5">{part.text}</mark>
        : <span key={i}>{part.text}</span>
    )

  const loadEmployees = async (silent = false) => {
    if (!silent) setIsLoading(true)
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Error", description: "Failed to load employees", variant: "destructive" })
    } else {
      setEmployees(data || [])
    }
    setIsLoading(false)
  }

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      toast({ title: "Done", description: success })
      await loadEmployees()
      return true
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = (employee: Employee) =>
    run(
      () => adminApi("PATCH", { id: employee.id, active: !employee.is_verified }),
      employee.is_verified ? `${employee.name} has been deactivated.` : `${employee.name} has been reactivated.`
    )

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Department", "Position", "Status", "Hire Date"]
    const rows = filteredEmployees.map(e => [
      e.name,
      e.email,
      e.role,
      e.department || "",
      e.position || "",
      e.is_verified ? "Active" : "Deactivated",
      e.hire_date || "",
    ])
    downloadCsv(`employees_${csvDateStamp()}.csv`, headers, rows)
  }

  const statusBadge = (employee: Employee) =>
    employee.is_verified ? (
      <Badge className="border-success/30 bg-success-soft text-success-soft-foreground">
        <CheckCircle aria-hidden="true" /> Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-muted-foreground">
        <Ban aria-hidden="true" /> Deactivated
      </Badge>
    )

  const actions = (employee: Employee, isSelf: boolean) => (
    <>
      <Button size="icon" variant="ghost" title="Edit" aria-label={`Edit ${employee.name}`} disabled={busy}
        onClick={() => setEditingEmployee(employee)}>
        <Pencil className="w-4 h-4" aria-hidden="true" />
      </Button>
      <Button size="icon" variant="ghost" title="Reset password" aria-label={`Reset password for ${employee.name}`} disabled={busy}
        onClick={() => setEmployeeToReset(employee)}>
        <KeyRound className="w-4 h-4" aria-hidden="true" />
      </Button>
      {!isSelf && (
        <>
          <Button size="icon" variant="ghost" disabled={busy}
            title={employee.is_verified ? "Deactivate" : "Reactivate"}
            aria-label={`${employee.is_verified ? "Deactivate" : "Reactivate"} ${employee.name}`}
            onClick={() => toggleActive(employee)}>
            {employee.is_verified
              ? <Ban className="w-4 h-4 text-warning-soft-foreground" aria-hidden="true" />
              : <CheckCircle className="w-4 h-4 text-success" aria-hidden="true" />}
          </Button>
          <Button size="icon" variant="ghost" title="Delete" aria-label={`Delete ${employee.name}`} disabled={busy}
            onClick={() => setEmployeeToDelete(employee)} className="hover:bg-danger-soft hover:text-destructive">
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </>
      )}
    </>
  )

  if (isLoading) {
    return (
      <SectionSkeleton rows={6} label="Loading employees" />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create accounts, reset passwords and manage access</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex items-center gap-2 order-2 sm:order-1" onClick={handleExportCSV}>
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button className="order-1 sm:order-2" onClick={() => setIsAddOpen(true)}>
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            Add Employee
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>All Employees ({employees.length})</CardTitle>
              <CardDescription>Deactivated accounts cannot sign in</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search employees"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-full pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            searchTerm
              ? <EmptyState icon={Search} title="No matching employees" description={`Nothing matches "${searchTerm}".`} />
              : <EmptyState icon={Users} title="No employees yet" description="Add your first team member to get started."
                  action={<Button size="sm" onClick={() => setIsAddOpen(true)}><UserPlus aria-hidden="true" />Add employee</Button>} />
          ) : (
          <>
          {/* Mobile: stacked cards */}
          <ul className="divide-y rounded-lg border md:hidden">
            {filteredEmployees.map((employee) => {
              const isSelf = employee.id === currentUserId
              return (
                <li key={employee.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <InitialsAvatar name={employee.name} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {highlight(employee.name)}
                        {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">{highlight(employee.email)}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant={employee.role === "admin" ? "default" : "secondary"} className="capitalize">{employee.role}</Badge>
                        {statusBadge(employee)}
                        {employee.department && <span className="text-xs text-muted-foreground">{employee.department}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end gap-1 border-t pt-2">{actions(employee, isSelf)}</div>
                </li>
              )
            })}
          </ul>
          <div className="hidden w-full overflow-x-auto md:block">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Hire Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                    const isSelf = employee.id === currentUserId
                    return (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={employee.name} />
                            <div className="min-w-0">
                              <div className="font-medium">
                                {highlight(employee.name)}
                                {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <Mail className="w-3 h-3 mr-1" aria-hidden="true" />
                                {highlight(employee.email)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-xs">
                            <Building className="w-3 h-3 mr-1" aria-hidden="true" />
                            {employee.department || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">{employee.position || "N/A"}</div>
                        </TableCell>
                        <TableCell>
                          {statusBadge(employee)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center text-xs">
                            <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
                            {employee.hire_date || "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">{actions(employee, isSelf)}</div>
                        </TableCell>
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

      {/* Add */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              The account works immediately. Give the employee their email and temporary password;
              they can change it after signing in.
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            mode="create"
            busy={busy}
            onCancel={() => setIsAddOpen(false)}
            onSubmit={async (data) => {
              const ok = await run(() => adminApi("POST", data), `${data.name} can now sign in with the temporary password.`)
              if (ok) setIsAddOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>Update details, email or role</DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EmployeeForm
              mode="edit"
              employee={editingEmployee}
              canChangeRole={editingEmployee.id !== currentUserId}
              busy={busy}
              onCancel={() => setEditingEmployee(null)}
              onSubmit={async (data) => {
                const changes: Record<string, unknown> = { id: editingEmployee.id }
                if (data.name !== editingEmployee.name) changes.name = data.name
                if (data.email !== editingEmployee.email) changes.email = data.email
                if (data.role !== editingEmployee.role) changes.role = data.role
                if (data.department !== (editingEmployee.department || "")) changes.department = data.department || null
                if (data.position !== (editingEmployee.position || "")) changes.position = data.position || null
                const ok = await run(() => adminApi("PATCH", changes), "Employee details updated.")
                if (ok) setEditingEmployee(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!employeeToReset} onOpenChange={(open) => !open && setEmployeeToReset(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {employeeToReset?.name}. Share it with them privately.
            </DialogDescription>
          </DialogHeader>
          {employeeToReset && (
            <ResetPasswordForm
              busy={busy}
              onCancel={() => setEmployeeToReset(null)}
              onSubmit={async (password) => {
                const ok = await run(
                  () => adminApi("PATCH", { id: employeeToReset.id, password }),
                  `Password reset for ${employeeToReset.name}.`
                )
                if (ok) setEmployeeToReset(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!employeeToDelete} onOpenChange={(open) => !open && setEmployeeToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Permanently delete {employeeToDelete?.name}? Their login, notes, attendance, task assignments
              and ratings are removed too. To keep history, deactivate the account instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeToDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (!employeeToDelete) return
                const ok = await run(
                  () => adminApi("DELETE", undefined, `?id=${encodeURIComponent(employeeToDelete.id)}`),
                  `${employeeToDelete.name} has been deleted.`
                )
                if (ok) setEmployeeToDelete(null)
              }}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EmployeeFormData {
  name: string
  email: string
  role: Role
  department: string
  position: string
  password: string
}

function EmployeeForm({
  mode,
  employee,
  canChangeRole = true,
  busy,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit"
  employee?: Employee
  canChangeRole?: boolean
  busy: boolean
  onSubmit: (data: EmployeeFormData) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: employee?.name || "",
    email: employee?.email || "",
    role: employee?.role || "employee",
    department: employee?.department || "",
    position: employee?.position || "",
    password: mode === "create" ? generatePassword() : "",
  })
  const set = (patch: Partial<EmployeeFormData>) => setFormData(prev => ({ ...prev, ...patch }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          ...formData,
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          department: formData.department.trim(),
          position: formData.position.trim(),
        })
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="emp-name">Full Name *</Label>
          <Input id="emp-name" value={formData.name} onChange={(e) => set({ name: e.target.value })} required maxLength={255} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-email">Email *</Label>
          <Input id="emp-email" type="email" value={formData.email} onChange={(e) => set({ email: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-dept">Department</Label>
          <Input id="emp-dept" value={formData.department} onChange={(e) => set({ department: e.target.value })} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="emp-pos">Position</Label>
          <Input id="emp-pos" value={formData.position} onChange={(e) => set({ position: e.target.value })} maxLength={100} />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={formData.role} onValueChange={(v) => set({ role: v as Role })} disabled={!canChangeRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="emp-pass">Temporary Password *</Label>
            <div className="flex gap-1">
              <Input id="emp-pass" value={formData.password} onChange={(e) => set({ password: e.target.value })}
                required minLength={8} maxLength={72} className="font-mono" />
              <Button type="button" variant="outline" size="icon" title="Generate" aria-label="Generate new password" onClick={() => set({ password: generatePassword() })}>
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>{mode === "create" ? "Create Account" : "Save Changes"}</Button>
      </DialogFooter>
    </form>
  )
}

function ResetPasswordForm({ busy, onSubmit, onCancel }: {
  busy: boolean
  onSubmit: (password: string) => void
  onCancel: () => void
}) {
  const [password, setPassword] = useState(generatePassword())
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(password) }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reset-pass">New temporary password</Label>
        <div className="flex gap-1">
          <Input id="reset-pass" value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={8} maxLength={72} className="font-mono" />
          <Button type="button" variant="outline" size="icon" title="Generate" aria-label="Generate new password" onClick={() => setPassword(generatePassword())}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={busy}>Reset Password</Button>
      </DialogFooter>
    </form>
  )
}
