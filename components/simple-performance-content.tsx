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
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { formatDate } from '@/lib/date-utils'
import { useToast } from "@/hooks/use-toast"
import { Plus, Edit, Trash2, Users, MessageSquareText, Star } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { InitialsAvatar } from '@/components/initials-avatar'
import { EmptyState, ErrorState, RatingStars, SectionSkeleton } from '@/components/feedback-states'

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

      // Load employees (exclude admin from rating)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, name, email, role')
        .eq('role', 'employee')  // Only load employees, not admins
        .order('name')

      if (employeesError) {
        setError(`Error loading employees: ${employeesError.message}`)
        return
      }
      setEmployees(employeesData || [])

      // Load performance ratings - simple query first
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('performance_ratings')
        .select('id, employee_id, rating, feedback, created_at')
        .order('created_at', { ascending: false })

      if (ratingsError) {
        setError(`Error loading performance ratings: ${ratingsError.message}`)
        return
      }

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
              feedback
            }
          ])
          .select()

        if (error) {
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
      setError(`Unexpected error: ${err}`)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useLiveRefresh(["performance_ratings", "employees"], () => loadData())

  if (loading) {
    return (
      <SectionSkeleton stats={3} rows={4} label="Loading performance" />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rate and track employee performance
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Rate Employee
        </Button>
      </div>

      {error && (
        <Card className="py-0">
          <ErrorState title="Couldn't load performance data" message={error} onRetry={() => { setLoading(true); loadData() }} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Employees" value={employees.length} icon={Users} tone="brand" />
        <StatCard label="Ratings given" value={ratings.length} icon={MessageSquareText} tone="info" />
        <StatCard
          label="Average rating"
          icon={Star}
          tone="warning"
          empty={ratings.length === 0}
          value={ratings.length > 0
            ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
            : '—'}
          hint="out of 5"
        />
      </div>

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
            <EmptyState
              icon={Star}
              title="No ratings yet"
              description="Rate an employee to start tracking performance."
              action={<Button size="sm" onClick={() => setIsDialogOpen(true)}><Plus aria-hidden="true" />Rate employee</Button>}
            />
          ) : (
            <div className="space-y-3">
              {ratings.map((rating) => (
                <div key={rating.id} className="rounded-lg border p-4 transition-colors duration-150 hover:bg-muted/40">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <InitialsAvatar name={rating.employees?.name || 'Unknown'} />
                      <div className="min-w-0">
                        <h4 className="font-semibold">{rating.employees?.name || 'Unknown Employee'}</h4>
                        <p className="truncate text-sm text-muted-foreground">{rating.employees?.email}</p>
                        {rating.feedback && <p className="mt-2 text-sm">{rating.feedback}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                      <div className="flex items-center gap-2">
                        <RatingStars value={rating.rating} />
                        <span className="text-sm font-semibold tabular-nums">{rating.rating}/5</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(rating.created_at)}
                      </p>
                      <div className="flex gap-1">
                        {canEditRating(rating.created_at) && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => editRating(rating)}
                              title="Edit rating"
                              aria-label={`Edit rating for ${rating.employees?.name ?? 'employee'}`}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteRating(rating.id, rating.created_at)}
                              title="Delete rating"
                              aria-label={`Delete rating for ${rating.employees?.name ?? 'employee'}`}
                              className="hover:bg-danger-soft hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
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
