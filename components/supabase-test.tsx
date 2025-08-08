"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export function SupabaseTest() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const testConnection = async () => {
    setTesting(true)
    const testResults: any = {}

    try {
      // Test 0: Basic environment check
      testResults.environment = {
        success: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        error: !process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Missing NEXT_PUBLIC_SUPABASE_URL' : 
               !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY' : null
      }

      // Test 1: Basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('employees')
        .select('count', { count: 'exact', head: true })

      testResults.connection = {
        success: !connectionError,
        error: connectionError?.message,
        details: connectionError?.details,
        hint: connectionError?.hint,
        code: connectionError?.code,
        data: connectionTest
      }

      // Test 2: Check if tables exist
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .limit(1)

      testResults.employees = {
        success: !employeesError,
        error: employeesError?.message,
        data: employees
      }

      // Test 3: Check auth
      const { data: authData, error: authError } = await supabase.auth.getUser()
      
      testResults.auth = {
        success: !authError,
        error: authError?.message,
        user: authData?.user
      }

      // Test 4: Check each table
      const tables = ['notes', 'tasks', 'task_assignments', 'attendance', 'performance_ratings']
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1)
          
          testResults[table] = {
            success: !error,
            error: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            count: data?.length || 0
          }
        } catch (err: any) {
          testResults[table] = {
            success: false,
            error: err.message
          }
        }
      }

      setResults(testResults)
      
      toast({
        title: "Test Complete",
        description: "Check the results below",
      })

    } catch (error: any) {
      console.error('Test error:', error)
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
        <CardDescription>
          Test the connection to Supabase and check if all tables are properly set up
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={testing}
          className="w-full"
        >
          {testing ? "Testing..." : "Run Supabase Test"}
        </Button>

        {results && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Test Results:</h3>
            
            {Object.entries(results).map(([key, value]: [string, any]) => (
              <div key={key} className="border rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{key}:</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    value.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {value.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                
                {value.error && (
                  <div className="text-red-600 text-sm mb-2">
                    Error: {value.error}
                    {value.details && <div>Details: {value.details}</div>}
                    {value.hint && <div>Hint: {value.hint}</div>}
                    {value.code && <div>Code: {value.code}</div>}
                  </div>
                )}
                
                {value.supabaseUrl && (
                  <div className="text-gray-600 text-sm mb-1">
                    URL: {value.supabaseUrl}
                  </div>
                )}
                
                {value.hasAnonKey !== undefined && (
                  <div className="text-gray-600 text-sm mb-1">
                    Has Anon Key: {value.hasAnonKey ? 'Yes' : 'No'}
                  </div>
                )}
                
                {value.data && (
                  <div className="text-gray-600 text-sm">
                    Data: {JSON.stringify(value.data, null, 2)}
                  </div>
                )}
                
                {value.count !== undefined && (
                  <div className="text-gray-600 text-sm">
                    Records: {value.count}
                  </div>
                )}
                
                {value.user && (
                  <div className="text-gray-600 text-sm">
                    User: {value.user.email || 'No email'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
