"use client"

import { useState } from "react"
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function DatabaseTest() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

  const testAll = async () => {
    if (!supabase) {
      setResults({ error: 'Supabase client not available' })
      return
    }

    setLoading(true)
    const testResults: any = {}

    try {
      // Test 1: Check employees table
      const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .limit(5)
      
      testResults.employees = {
        success: !empError,
        error: empError?.message,
        count: employees?.length || 0,
        data: employees?.slice(0, 3) || []
      }

      // Test 2: Check tasks table
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .limit(5)
      
      testResults.tasks = {
        success: !taskError,
        error: taskError?.message,
        count: tasks?.length || 0,
        data: tasks?.slice(0, 3) || []
      }

      // Test 3: Check performance_ratings table
      const { data: ratings, error: ratingError } = await supabase
        .from('performance_ratings')
        .select('*')
        .limit(5)
      
      testResults.performance_ratings = {
        success: !ratingError,
        error: ratingError?.message,
        count: ratings?.length || 0,
        data: ratings?.slice(0, 3) || []
      }

      // Test 4: Check attendance table
      const { data: attendance, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .limit(5)
      
      testResults.attendance = {
        success: !attError,
        error: attError?.message,
        count: attendance?.length || 0,
        data: attendance?.slice(0, 3) || []
      }

      console.log('Database test results:', testResults)
      setResults(testResults)

    } catch (error) {
      console.error('Database test failed:', error)
      testResults.error = error
      setResults(testResults)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Database Test</CardTitle>
        <Button onClick={testAll} disabled={loading}>
          {loading ? "Testing..." : "Test Database"}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
          {JSON.stringify(results, null, 2)}
        </pre>
      </CardContent>
    </Card>
  )
}
