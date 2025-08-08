'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/date-utils'
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2 } from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  role: string
}

interface PerformanceRating {
  id: string
  employee_id: string
  rating: number
  feedback: string
  created_at: string
  employees: {
    name: string
    email: string
  } | null
}

export default function SimplePerformanceContent() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [ratings, setRatings] = useState<PerformanceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRating, setEditingRating] = useState<PerformanceRating | null>(null)
  const { toast } = useToast()
  
  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [rating, setRating] = useState<string>('')
  const [feedback, setFeedback] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {

    try {
      console.log('Loading employees and performance ratings...')
      
      // Load employees (exclude admin from rating)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .eq('role', 'employee')  // Only load employees, not admins
        .order('name')

      if (employeesError) {
        console.error('Error loading employees:', employeesError)
        setError(`Error loading employees: ${employeesError.message}`)
        return
      }

      console.log('Employees loaded:', employeesData)
      setEmployees(employeesData || [])

      // Load performance ratings - simple query first
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('performance_ratings')
        .select('id, employee_id, rating, feedback, created_at')
        .order('created_at', { ascending: false })

      if (ratingsError) {
        console.error('Error loading performance ratings:', ratingsError)
        setError(`Error loading performance ratings: ${ratingsError.message}`)
        return
      }

      console.log('Performance ratings loaded:', ratingsData)
      
      // Create employee map for names
      const employeeMap = new Map()
      employeesData?.forEach(emp => {
        employeeMap.set(emp.id, { name: emp.name, email: emp.email })
      })
      
      // Combine ratings data with employee names
      const ratingsWithEmployees = (ratingsData || []).map(rating => ({
        ...rating,
        employees: employeeMap.get(rating.employee_id) || { name: 'Unknown', email: '' }
      }))
      
      setRatings(ratingsWithEmployees)
      setError(null)

    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const canEditRating = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime()
    const currentTime = new Date().getTime()
    const hoursDiff = (currentTime - createdTime) / (1000 * 60 * 60)
    return hoursDiff < 24
  }

  const editRating = (rating: PerformanceRating) => {
    if (!canEditRating(rating.created_at)) {
      toast({
        title: "Cannot Edit",
        description: "Ratings can only be edited within 24 hours of creation",
        variant: "destructive"
      })
      return
    }
    
    setEditingRating(rating)
    setSelectedEmployee(rating.employee_id)
    setRating(rating.rating.toString())
    setFeedback(rating.feedback)
    setIsDialogOpen(true)
  }

  const deleteRating = async (ratingId: string, createdAt: string) => {
    if (!canEditRating(createdAt)) {
      toast({
        title: "Cannot Delete",
        description: "Ratings can only be deleted within 24 hours of creation",
        variant: "destructive"
      })
      return
    }

    try {
      const { error } = await supabase
        .from('performance_ratings')
        .delete()
        .eq('id', ratingId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Performance rating deleted successfully",
      })
      
      await loadData()
    } catch (error) {
      console.error('Error deleting rating:', error)
      toast({
        title: "Error",
        description: "Failed to delete rating",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setSelectedEmployee('')
    setRating('')
    setFeedback('')
    setEditingRating(null)
    setIsDialogOpen(false)
  }

  const addPerformanceRating = async () => {
    if (!supabase) {
      setError('Supabase client not available')
      return
    }

    if (!selectedEmployee || !rating || !feedback.trim()) {
      setError('Please fill in all fields')
      return
    }

    const ratingNum = parseInt(rating)
    if (ratingNum < 1 || ratingNum > 5) {
      setError('Rating must be between 1 and 5')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      if (editingRating) {
        // Update existing rating
        const { error } = await supabase
          .from('performance_ratings')
          .update({
            employee_id: selectedEmployee,
            rating: ratingNum,
            feedback
          })
          .eq('id', editingRating.id)

        if (error) {
          console.error('Error updating performance rating:', error)
          setError(`Error updating performance rating: ${error.message}`)
          return
        }

        toast({
          title: "Success",
          description: "Performance rating updated successfully",
        })
      } else {
        // Create new rating
        const { data, error } = await supabase
          .from('performance_ratings')
          .insert([
            {
              employee_id: selectedEmployee,
              rating: ratingNum,
              feedback,
              rated_by: '11111111-1111-1111-1111-111111111111'
            }
          ])
          .select()

        if (error) {
          console.error('Error creating performance rating:', error)
          setError(`Error creating performance rating: ${error.message}`)
          return
        }

        toast({
          title: "Success",
          description: "Performance rating added successfully",
        })
      }
      
      // Reset form and reload data
      resetForm()
      await loadData()

    } catch (err) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Performance Management</h2>
        <p>Loading performance data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Performance Management</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Rate and track employee performance
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Rate Employee
        </Button>
      </div>
      
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics - Moved to Top */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">{employees.length}</div>
              <p className="text-gray-600 text-sm md:text-base">Total Employees</p>
            </div>
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold">{ratings.length}</div>
              <p className="text-gray-600 text-sm md:text-base">Total Ratings</p>
            </div>
            <div className="text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-bold text-yellow-600">
                {ratings.length > 0 
                  ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-gray-600 text-sm md:text-base">Average Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Employee Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg md:text-xl">
              {editingRating ? 'Edit Performance Rating' : 'Rate Employee Performance'}
            </DialogTitle>
            <DialogDescription className="text-sm md:text-base">
              {editingRating ? 'Update the performance rating for this employee' : 'Provide a performance rating and feedback for an employee'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!!editingRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} ({employee.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rating">Rating (1-5)</Label>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Poor</SelectItem>
                  <SelectItem value="2">2 - Below Average</SelectItem>
                  <SelectItem value="3">3 - Average</SelectItem>
                  <SelectItem value="4">4 - Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter performance feedback..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={addPerformanceRating} 
              disabled={submitting}
              className="w-full"
            >
              {submitting ? 'Saving...' : (editingRating ? 'Update Rating' : 'Add Performance Rating')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Ratings List */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Ratings ({ratings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No performance ratings found.</p>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{rating.employees?.name || 'Unknown Employee'}</h4>
                      <p className="text-sm text-gray-600">{rating.employees?.email}</p>
                      <p className="text-gray-700 mt-2">{rating.feedback}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-lg font-bold mb-2">
                        {rating.rating}/5 ⭐
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {formatDate(rating.created_at)}
                      </p>
                      <div className="flex gap-1">
                        {canEditRating(rating.created_at) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editRating(rating)}
                              title="Edit Rating"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteRating(rating.id, rating.created_at)}
                              title="Delete Rating"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
