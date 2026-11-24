"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, TrendingUp, LineChart as LineChartIcon } from "lucide-react"
import { EmptyState, ErrorState, RatingStars } from "@/components/feedback-states"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { useLiveRefresh } from "@/lib/use-live-refresh"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard } from "@/components/stat-card"

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

    if (userId) {
      loadPerformanceRatings()
    } else {
      setError('User authentication required')
    }
  }, [userId])

  useLiveRefresh(["performance_ratings"], () => loadPerformanceRatings(true), !!userId)

  const loadPerformanceRatings = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)

      if (!userId) {
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

        // If the join fails, try without the join
        const { data: simpleData, error: simpleError } = await supabase
          .from('performance_ratings')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false })

        if (simpleError) {
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
        setRatings(transformedData)
        return
      }

      const transformedData: PerformanceRating[] = (data || []).map((rating: any) => ({
        id: rating.id,
        period: rating.period,
        rating: rating.rating,
        feedback: rating.feedback,
        created_at: rating.created_at,
        rated_by_name: (rating.employees as { name?: string } | null)?.name || 'Admin'
      }))
      setRatings(transformedData)
    } catch (error) {
      setError('Failed to load performance data')
      setRatings([])
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => <RatingStars value={Math.floor(rating)} />

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your performance ratings and feedback
        </p>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Average" value={averageRating.toFixed(1)} empty={!ratings.length} tone="warning" icon={TrendingUp} hint={ratings.length ? <span className="inline-flex">{renderStars(averageRating)}</span> : undefined} />
        <StatCard label="Reviews" value={ratings.length} icon={Star} tone="info" />
        <StatCard label="Latest" value={ratings[0]?.rating.toFixed(1)} empty={!ratings.length} tone="brand" icon={Star} hint={ratings[0]?.period} />
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
                <LineChart data={chartData} margin={{ top: 5, right: 16, left: -16, bottom: 40 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={56}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={6}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}/5`, 'Rating']}
                    labelFormatter={(label: string) => `Period: ${label}`}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)", fontSize: 12 }}
                    labelStyle={{ color: "var(--popover-foreground)", fontWeight: 500 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="var(--brand)"
                    strokeWidth={2.5}
                    dot={{ fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7 }}
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
            <EmptyState icon={LineChartIcon} title="No trend yet" description="Your trend appears after your first review." />
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
            <div className="space-y-3" aria-busy="true">
              <span className="sr-only">Loading performance…</span>
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState title="Couldn't load performance" message={error} onRetry={() => loadPerformanceRatings()} />
          ) : ratings.length === 0 ? (
            <EmptyState icon={Star} title="No ratings yet" description="Your supervisor will add ratings after evaluations." />
          ) : (
            <div className="w-full">
              <div className="space-y-3">
                {ratings.map((rating) => (
                  <div key={rating.id} className="rounded-lg border p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2 md:mb-0">
                        {rating.period && <Badge variant="outline">{rating.period}</Badge>}
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
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Feedback:</span> {rating.feedback}
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
