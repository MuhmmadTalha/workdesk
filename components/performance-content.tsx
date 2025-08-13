"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Star, Plus, Loader2, BarChart3 } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PerformanceRating {
  id: string
  employee_id: string
  rated_by: string
  period: string
  rating: number
  feedback: string
  created_at: string
  employee_name?: string
}

interface Employee {
  id: string
  name: string
  email: string
}

export function PerformanceContent() {
  const [ratings, setRatings] = useState<PerformanceRating[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    period: "",
    rating: 1,
    feedback: ""
  })
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast()

  // Test database connectivity
  const testDatabase = async () => {
    console.log('🔧 Testing database connectivity...')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')
    console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET')
    
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('count')
        .limit(1)
      
      if (error) {
        console.error('❌ Database test failed:', error)
        toast({
          title: "Database Test Failed",
          description: error.message,
          variant: "destructive"
        })
      } else {
        console.log('✅ Database connection successful')
        toast({
          title: "Database Connected",
          description: "Successfully connected to Supabase",
        })
      }
    } catch (err) {
      console.error('❌ Database test error:', err)
      toast({
        title: "Connection Error",
        description: "Failed to connect to database",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadRatings()
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      console.log('🔍 Loading employees for performance rating...')
      // Get current user to exclude admin from rating themselves
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      const currentUser = userStr ? JSON.parse(userStr) : null
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('role', 'employee') // Only employees, not admins
        .eq('is_verified', true)
        .order('name')

      if (error) {
        console.error('❌ Error loading employees:', error)
        // If table doesn't exist, show a user-friendly message
        if (error.message?.includes('relation "employees" does not exist')) {
          toast({
            title: "Setup Required",
            description: "Employee data requires database setup. Please contact your administrator.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error",
            description: "Failed to load employees. Please try again.",
            variant: "destructive"
          })
        }
        setEmployees([])
        return
      }
      
      // Filter out current admin user if they somehow appear in employee list
      const filteredEmployees = currentUser && currentUser.role === 'admin' 
        ? (data || []).filter(emp => emp.id !== currentUser.id)
        : (data || [])
      
      console.log('✅ Loaded employees for rating (excluding admin):', filteredEmployees?.length || 0)
      if (!filteredEmployees || filteredEmployees.length === 0) {
        console.log('⚠️ No verified employees found for performance rating')
      }
      setEmployees(filteredEmployees || [])
      console.log('Loaded employees:', filteredEmployees?.length || 0) // Debug log
    } catch (error) {
      console.error('Error loading employees:', error)
      toast({
        title: "Error",
        description: "Failed to load employees. Please try again.",
        variant: "destructive"
      })
      setEmployees([])
    }
  }

  const loadRatings = async () => {
    try {
      setIsLoading(true)
      console.log('🔍 Loading performance ratings...')
      
      // First test basic connectivity
      const { data: testData, error: testError } = await supabase
        .from('employees')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('❌ Supabase connection test failed:', testError)
        toast({
          title: "Database Connection Error",
          description: `Cannot connect to database: ${testError.message}`,
          variant: "destructive"
        })
        setRatings([])
        return
      }
      
      console.log('✅ Database connection test passed')
      
      // Now try to get performance ratings
      const { data, error } = await supabase
        .from('performance_ratings')
        .select('*, employees!inner(name)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Performance ratings error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Check if table exists
        if (error.message.includes('relation "performance_ratings" does not exist')) {
          toast({
            title: "Table Missing",
            description: "Performance ratings table doesn't exist. Please run the database setup script.",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Error loading performance data",
            description: error.message || "Unknown database error",
            variant: "destructive"
          })
        }
        setRatings([])
        return
      }
      
      console.log('✅ Performance ratings raw data:', data)
      
      // Transform data to include employee names
      const ratingsWithNames = data?.map((rating: any) => ({
        ...rating,
        employee_name: rating.employees?.name || 'Unknown Employee'
      })) || []

      console.log('✅ Performance ratings with names:', ratingsWithNames)
      setRatings(ratingsWithNames)
    } catch (error) {
      console.error('Error loading ratings:', error)
      toast({
        title: "Error",
        description: "Failed to load performance ratings",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employeeId || !formData.period || !formData.feedback) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    try {
      console.log('🔍 Adding performance rating for employee:', formData.employeeId)
      
      // Get current user from localStorage (since we're using custom auth)
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (!userStr) {
        toast({
          title: "Error",
          description: "Please log in again",
          variant: "destructive"
        })
        return
      }
      
      const currentUser = JSON.parse(userStr)
      console.log('🔍 Current user (rater):', currentUser)
      
      const { error } = await supabase
        .from('performance_ratings')
        .insert([{
          employee_id: formData.employeeId,
          rated_by: currentUser.id,
          period: formData.period,
          rating: formData.rating,
          feedback: formData.feedback
        }])

      if (error) {
        console.error('❌ Performance rating error:', error)
        throw error
      }

      console.log('✅ Performance rating added successfully')

      await loadRatings() // Reload ratings
      setIsDialogOpen(false)
      setFormData({ employeeName: "", employeeId: "", period: "", rating: 5, feedback: "" })
      
      toast({
        title: "Rating Added",
        description: `Performance rating for ${formData.employeeName} has been successfully added.`,
      })
    } catch (error) {
      console.error('❌ Error adding rating:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      
      // Check if it's a database table issue
      if (error instanceof Error && error.message.includes('relation "performance_ratings" does not exist')) {
        toast({
          title: "Database Setup Required",
          description: "Please run the database setup script first. Check the SIMPLIFIED-DATABASE-SETUP.sql file.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: `Failed to add performance rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: "destructive"
        })
      }
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "default"
    if (rating >= 3) return "secondary"
    return "outline"
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
      />
    ))
  }

  // Filter ratings by employee name only
  const filteredRatings = ratings.filter(rating =>
    rating.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Highlight helper for name only
  function highlightText(text: string) {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <span key={i} style={{ background: '#fde68a', color: '#b45309', borderRadius: '2px', padding: '0 2px' }}>{part}</span>
        : part
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance</h2>
          <p className="text-muted-foreground">
            Rate and track employee performance over time
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Rate Performance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rate Employee Performance</DialogTitle>
              <DialogDescription>
                Provide a performance rating and feedback for an employee
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select 
                    value={formData.employeeId} 
                    onValueChange={(value) => {
                      const selectedEmployee = employees.find(emp => emp.id === value)
                      setFormData({
                        ...formData, 
                        employeeId: value,
                        employeeName: selectedEmployee?.name || ""
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select value={formData.period} onValueChange={(value) => setFormData({...formData, period: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                      <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      <SelectItem value="January 2025">January 2025</SelectItem>
                      <SelectItem value="February 2025">February 2025</SelectItem>
                      <SelectItem value="March 2025">March 2025</SelectItem>
                      <SelectItem value="April 2025">April 2025</SelectItem>
                      <SelectItem value="May 2025">May 2025</SelectItem>
                      <SelectItem value="June 2025">June 2025</SelectItem>
                      <SelectItem value="July 2025">July 2025</SelectItem>
                      <SelectItem value="August 2025">August 2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Select value={formData.rating.toString()} onValueChange={(value) => setFormData({...formData, rating: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} Star{i + 1 > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={formData.feedback}
                    onChange={(e) => setFormData({...formData, feedback: e.target.value})}
                    placeholder="Provide detailed feedback..."
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Submit Rating</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Chart - Moved to top for statistics */}
      {ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Statistics
            </CardTitle>
            <CardDescription>
              Overview of average performance ratings by employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  // Process ratings data for chart
                  console.log('🔍 Processing ratings for chart:', ratings)
                  const performanceMap = new Map()
                  ratings.forEach(rating => {
                    const name = rating.employee_name || 'Unknown'
                    if (!performanceMap.has(name)) {
                      performanceMap.set(name, [])
                    }
                    performanceMap.get(name).push(rating.rating)
                  })

                  const chartData = Array.from(performanceMap.entries()).map(([name, ratings]) => ({
                    name: name.split(' ')[0], // First name only for charts
                    rating: ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length
                  }))
                  
                  console.log('📊 Chart data generated:', chartData)
                  return chartData
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[0, 5]} fontSize={12} />
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} / 5`, 'Rating']} />
                  <Bar dataKey="rating" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Performance Ratings</CardTitle>
              <CardDescription>
                Employee performance ratings and feedback history
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Search employee name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
              <Button 
                variant="outline" 
                onClick={testDatabase}
                className="ml-2"
              >
                Test Database
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              Loading performance ratings...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Stars</TableHead>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRatings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No performance ratings yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRatings.map((rating) => (
                    <TableRow key={rating.id}>
                      <TableCell className="font-medium">{highlightText(rating.employee_name || "")}</TableCell>
                      <TableCell>{rating.period}</TableCell>
                      <TableCell>
                        <Badge variant={getRatingColor(rating.rating)}>
                          {rating.rating}/5
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          {renderStars(rating.rating)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{rating.feedback}</TableCell>
                      <TableCell>{new Date(rating.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
