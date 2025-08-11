"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "employee"
  isVerified?: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, remember?: boolean) => Promise<boolean>
  logout: () => void
  forgotPassword: (email: string) => Promise<boolean>
  isLoading: boolean
  isAuthLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true) // Start as true
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  console.log('🔍 AuthProvider initialized with supabase:', supabase)

  useEffect(() => {
    // Check for stored authentication on mount (client-side only)
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem("user")
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          console.log('✅ Restored user from localStorage:', parsedUser)
          setUser(parsedUser)
        } catch (error) {
          console.error('Error parsing stored user:', error)
          localStorage.removeItem("user")
        }
      }
    }
    setIsAuthLoading(false) // Always set to false after checking
  }, [])

  const login = async (email: string, password: string, remember = false): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 Attempting login for:', email)
      console.log('🔍 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
      
      // First check if user exists in our employees table
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('email', email)
        .single()

      console.log('🔍 Database query result:', { employee, employeeError })

      if (employeeError || !employee) {
        console.log('❌ User not found in database')
        console.log('❌ Error details:', employeeError)
        setError("User not registered. Contact company developer team or admin.")
        setIsLoading(false)
        return false
      }

      console.log('✅ User found:', employee)

      // Validate password - default password is '12345678' for all users
      if (!password || password.trim() === '') {
        console.log('❌ Empty password')
        setError("Please enter a password.")
        setIsLoading(false)
        return false
      }

      // Check if password matches the default password
      if (password !== '12345678') {
        console.log('❌ Invalid password')
        setError("Invalid password. Please use the default password.")
        setIsLoading(false)
        return false
      }

      console.log('✅ Password validation passed - correct default password')

      // Check if user is verified (only for employees)
      if (employee.role === 'employee' && !employee.is_verified) {
        console.log('❌ Employee not verified')
        setError("Account pending verification. Contact your administrator.")
        setIsLoading(false)
        return false
      }

      console.log('✅ User verification check passed')

      const userData: User = {
        id: employee.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        isVerified: employee.is_verified
      }

      setUser(userData)
      
      // Always store user in localStorage for session persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem("user", JSON.stringify(userData))
        console.log('✅ User stored in localStorage for persistence')
      }

      // Set auth loading for 3 seconds (reduced)
      setIsAuthLoading(true)
      setTimeout(() => {
        setIsAuthLoading(false)
      }, 3000)
      
      setIsLoading(false)
      console.log('✅ Login successful!')
      return true
    } catch (err) {
      console.error('❌ Login error:', err)
      setError("Connection error. Please check your internet connection.")
      setIsLoading(false)
      return false
    }
  }

  const forgotPassword = async (email: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Always return the same error message for security
      setError("User not registered. Contact company developer team or admin.")
      setIsLoading(false)
      return false
    } catch (err) {
      setError("User not registered. Contact company developer team or admin.")
      setIsLoading(false)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem("user")
      // Persist current theme to localStorage
      const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
    }
    router.push("/login")
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    forgotPassword,
    isLoading,
    isAuthLoading,
    error
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
