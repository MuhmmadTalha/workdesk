"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserPlus, CheckCircle, XCircle, Clock, Mail, Calendar, Building, Pencil, Trash2, Download } from "lucide-react"
import { supabase, type Employee } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { emailService } from "@/lib/email-service"

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingEmployee, setIsAddingEmployee] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadEmployees()
  }, [])

  useEffect(() => {
    // Filter and sort employees
    let filtered = employees.filter(employee => 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Sort: Admins first, then by name
    filtered.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1
      if (a.role !== 'admin' && b.role === 'admin') return 1
      return a.name.localeCompare(b.name)
    })

    setFilteredEmployees(filtered)
  }, [employees, searchTerm])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setIsLoading(true)
      
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      console.log('✅ Loaded employees:', employees?.length || 0)
      setEmployees(employees || [])
    } catch (error) {
      console.error('Error loading employees:', error)
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyEmployee = async (employeeId: string) => {
    try {
      // Get employee details first
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single()

      if (fetchError || !employee) {
        throw new Error('Employee not found')
      }

      // Update employee verification status
      const { error } = await supabase
        .from('employees')
        .update({ is_verified: true })
        .eq('id', employeeId)

      if (error) {
        throw error
      }

      // Send verification email with login credentials
      try {
        await emailService.sendEmployeeVerificationEmail({
          name: employee.name,
          email: employee.email,
          companyName: 'Gen-T',
          adminName: 'Muhammad Talha Butt',
          dashboardUrl: `${window.location.origin}/login`
        })
        
        console.log('✅ Verification email sent to:', employee.email)
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError)
        // Don't fail the verification if email fails
      }

      // Reload employees to get updated data
      await loadEmployees()
      
      toast({
        title: "Employee Verified",
        description: `${employee.name} has been verified and notified via email with login credentials.`,
      })
    } catch (error) {
      console.error('Error verifying employee:', error)
      toast({
        title: "Error",
        description: "Failed to verify employee",
        variant: "destructive"
      })
    }
  }

  const handleRejectEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId)

      if (error) {
        throw error
      }

      // Reload employees to get updated data
      await loadEmployees()
      
      toast({
        title: "Employee Rejected",
        description: "Employee has been removed from the system",
      })
    } catch (error) {
      console.error('Error rejecting employee:', error)
      toast({
        title: "Error", 
        description: "Failed to reject employee",
        variant: "destructive"
      })
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsEditDialogOpen(true)
  }

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeToDelete.id)

      if (error) {
        throw error
      }

      await loadEmployees()
      setIsDeleteDialogOpen(false)
      setEmployeeToDelete(null)
      
      toast({
        title: "Employee Deleted",
        description: `${employeeToDelete.name} has been permanently removed from the system.`,
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        title: "Error",
        description: "Failed to delete employee",
        variant: "destructive"
      })
    }
  }

  const handleUpdateEmployee = async (updatedData: Partial<Employee>) => {
    if (!editingEmployee) return

    try {
      const { error } = await supabase
        .from('employees')
        .update(updatedData)
        .eq('id', editingEmployee.id)

      if (error) {
        throw error
      }

      await loadEmployees()
      setIsEditDialogOpen(false)
      setEditingEmployee(null)
      
      toast({
        title: "Employee Updated",
        description: "Employee details have been successfully updated.",
      })
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive"
      })
    }
  }

  const getStatusBadge = (isVerified: boolean) => {
    if (isVerified) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employee Management</h2>
          <p className="text-muted-foreground">
            Manage and verify employee accounts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex items-center gap-2 order-2 sm:order-1">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="order-1 sm:order-2">
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Add a new employee to the system.
              </DialogDescription>
            </DialogHeader>
            <AddEmployeeForm onSubmit={async (data) => {
              try {
                // Add employee to database
                const { error } = await supabase
                  .from('employees')
                  .insert([{
                    email: data.email,
                    name: data.name,
                    department: data.department,
                    position: data.position,
                    role: 'employee',
                    is_verified: false,
                    hire_date: new Date().toISOString().split('T')[0]
                  }])

                if (error) {
                  throw error
                }

                // Send welcome email to new employee
                try {
                  await emailService.sendEmployeeWelcomeEmail({
                    name: data.name,
                    email: data.email,
                    companyName: 'Gen-T',
                    adminName: 'Muhammad Talha Butt',
                    setupUrl: `${window.location.origin}/login`
                  })
                  
                  console.log('✅ Welcome email sent to:', data.email)
                } catch (emailError) {
                  console.error('⚠️ Failed to send welcome email:', emailError)
                  // Don't fail the employee creation if email fails
                }

                // Reload employees to show the new employee
                await loadEmployees()

                toast({
                  title: "Employee Added Successfully",
                  description: `${data.name} has been added to the system and notified via email. They are pending verification.`,
                })
              } catch (error) {
                console.error('Error adding employee:', error)
                // Safely log error details
                if (error instanceof Error) {
                  console.error('Error message:', error.message)
                  console.error('Error stack:', error.stack)
                } else {
                  console.error('Error type:', typeof error)
                  console.error('Error value:', error)
                }
                
                const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
                toast({
                  title: "Error",
                  description: `Failed to add employee: ${errorMsg}`,
                  variant: "destructive"
                })
              }
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Employees</CardTitle>
                <CardDescription>
                  View and manage employee verification status
                </CardDescription>
              </div>
              <div className="w-full sm:w-72">
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hire Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? `No employees found matching "${searchTerm}"` : 'No employees found'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="group hover:bg-muted/50">
                    <TableCell>
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Mail className="w-3 h-3 mr-1" />
                            {employee.email}
                          </div>
                        </div>
                        {employee.role !== 'admin' && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditEmployee(employee)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEmployee(employee)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'}>
                        {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center text-sm">
                          <Building className="w-3 h-3 mr-1" />
                          {employee.department || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {employee.position || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(employee.is_verified)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!employee.is_verified && employee.role !== 'admin' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleVerifyEmployee(employee.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectEmployee(employee.id)}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {employee.is_verified && (
                        <Badge variant="outline" className="text-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          {editingEmployee && (
            <EditEmployeeForm 
              employee={editingEmployee} 
              onSubmit={handleUpdateEmployee}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {employeeToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteEmployee}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddEmployeeForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    position: "",
    role: "employee"
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert('Name is required')
      return
    }
    
    if (!formData.email.trim()) {
      alert('Email is required')
      return
    }
    
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Enter full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            placeholder="Enter email address"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="Enter department"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <Input
          id="position"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          placeholder="Enter position/job title"
        />
      </div>
      <div className="text-sm text-gray-500 mt-2">
        <span className="text-red-500">*</span> Required fields
      </div>
      <DialogFooter>
        <Button type="submit">Add Employee</Button>
      </DialogFooter>
    </form>
  )
}

function EditEmployeeForm({ 
  employee, 
  onSubmit, 
  onCancel 
}: { 
  employee: Employee
  onSubmit: (data: Partial<Employee>) => void
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState({
    name: employee.name || "",
    email: employee.email || "",
    department: employee.department || "",
    position: employee.position || "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Name *</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email *</Label>
          <Input
            id="edit-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-department">Department</Label>
          <Input
            id="edit-department"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-position">Position</Label>
        <Input
          id="edit-position"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Update Employee
        </Button>
      </DialogFooter>
    </form>
  )
}
