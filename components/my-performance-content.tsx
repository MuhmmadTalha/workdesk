"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, Loader2 } from 'lucide-react'
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PerformanceRating {
  id: string
  period: string
  rating: number
  feedback: string
  created_at: string
  rated_by_name: string
}

interface MyPerformanceContentProps {
  userId: string
}

export function MyPerformanceContent({ userId }: MyPerformanceContentProps) {
  const [ratings, setRatings] = useState<PerformanceRating[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('🚀 MyPerformanceContent component mounted')
    console.log('👤 User ID received:', userId)
    
    if (userId) {
      loadPerformanceRatings()
    } else {
      console.warn('⚠️ No userId provided to MyPerformanceContent')
      setError('User authentication required')
    }
  }, [userId])

  const loadPerformanceRatings = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔍 Loading performance ratings for user:', userId)

      if (!userId) {
        console.warn('⚠️ No userId provided')
        setRatings([])
        setLoading(false)
        return
      }

      // First, let's try a simpler query to see if the table exists and has data
      const { data, error } = await supabase
        .from('performance_ratings')
        .select(`
          id,
          period,
          rating,
          feedback,
          created_at,
          rated_by,
          employees!performance_ratings_rated_by_fkey(name)
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Performance ratings error:', error)
        
        // If the join fails, try without the join
        const { data: simpleData, error: simpleError } = await supabase
          .from('performance_ratings')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false })

        if (simpleError) {
          console.error('❌ Simple query also failed:', simpleError)
          if (simpleError.message?.includes('relation "performance_ratings" does not exist')) {
            setError('Performance tracking requires database setup. Please contact your administrator.')
          } else {
            setError(`Database error: ${simpleError.message}`)
          }
          setRatings([])
          return
        }

        // If simple query works, transform the data without the join
        const transformedData: PerformanceRating[] = (simpleData || []).map((rating: any) => ({
          id: rating.id,
          period: rating.period,
          rating: rating.rating,
          feedback: rating.feedback,
          created_at: rating.created_at,
          rated_by_name: 'Admin' // Fallback since join failed
        }))

        console.log('✅ Performance ratings loaded (without join):', transformedData.length)
        setRatings(transformedData)
        return
      }

      const transformedData: PerformanceRating[] = (data || []).map((rating: any) => ({
        id: rating.id,
        period: rating.period,
        rating: rating.rating,
        feedback: rating.feedback,
        created_at: rating.created_at,
        rated_by_name: (rating.employees as any)?.name || 'Unknown'
      }))

      console.log('✅ Performance ratings loaded:', transformedData.length)
      setRatings(transformedData)
    } catch (error) {
      console.error('❌ Error loading performance ratings:', error)
      setError('Failed to load performance data')
      setRatings([])
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? "fill-yellow-400 text-yellow-400" 
            : "fill-gray-200 text-gray-200"
        }`}
      />
    ))
  }

  const averageRating = ratings.length > 0 
    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
    : 0

  // Prepare chart data
  const chartData = ratings
    .slice()
    .reverse()
    .map((rating, index) => ({
      period: rating.period || `Period ${index + 1}`,
      rating: rating.rating
    }))

  console.log('📊 Chart data prepared:', chartData)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">My Performance</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          Track your performance ratings and feedback
        </p>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
            <div className="flex items-center mt-1">
              {renderStars(averageRating)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ratings.length}</div>
            <p className="text-xs text-muted-foreground">
              Performance evaluations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latest Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ratings.length > 0 ? ratings[0].rating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {ratings.length > 0 ? ratings[0].period : 'No ratings yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      {chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Performance Trend</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Your performance ratings over time ({chartData.length} data points)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    fontSize={12}
                    tickCount={6}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}/5`, 'Rating']}
                    labelFormatter={(label: string) => `Period: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : !loading && ratings.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Performance Trend</CardTitle>
            <CardDescription className="text-sm md:text-base">
              Your performance ratings over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No performance data available to display a trend chart.
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Performance History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Performance History</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Detailed performance evaluations and feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading performance data...
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No performance ratings yet. Your supervisor will add ratings after evaluations.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="space-y-4 min-w-[400px]">
                {ratings.map((rating) => (
                  <div key={rating.id} className="border rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <div className="flex items-center space-x-2 mb-2 md:mb-0">
                        <Badge variant="outline">{rating.period}</Badge>
                        <div className="flex items-center">
                          {renderStars(rating.rating)}
                          <span className="ml-2 font-semibold">{rating.rating.toFixed(1)}/5</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rated by: {rating.rated_by_name}
                      </div>
                    </div>
                    {rating.feedback && (
                      <div className="mt-2">
                        <p className="text-sm md:text-base text-muted-foreground">
                          <strong>Feedback:</strong> {rating.feedback}
                        </p>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(rating.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MyPerformanceContent
