"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "employee"
  isVerified?: boolean
  department?: string
  position?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  changePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>
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

/** Loads the employees row for a Supabase Auth user. RLS only lets users read their own row. */
async function loadProfile(authUserId: string): Promise<User | null> {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, email, name, role, is_verified, department, position")
    .eq("id", authUserId)
    .single()

  if (error || !employee) return null

  return {
    id: employee.id,
    email: employee.email,
    name: employee.name,
    role: employee.role,
    isVerified: employee.is_verified,
    department: employee.department || "",
    position: employee.position || "",
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const refreshFromSession = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      setUser(null)
      return
    }
    const profile = await loadProfile(authUser.id)
    if (!profile || !profile.isVerified) {
      await supabase.auth.signOut()
      setUser(null)
      return
    }
    setUser(profile)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsAuthLoading(false)
      return
    }

    refreshFromSession().finally(() => setIsAuthLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setUser(null)
    })
    return () => subscription.unsubscribe()
  }, [refreshFromSession])

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!isSupabaseConfigured) {
        setError("The app is not connected to a database yet. Contact the administrator.")
        return false
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (signInError || !data.user) {
        const banned = signInError?.message?.toLowerCase().includes("banned")
        setError(banned
          ? "Your account has been deactivated. Contact your administrator."
          : "Invalid email or password.")
        return false
      }

      const profile = await loadProfile(data.user.id)
      if (!profile) {
        await supabase.auth.signOut()
        setError("No employee profile found for this account. Contact your administrator.")
        return false
      }
      if (!profile.isVerified) {
        await supabase.auth.signOut()
        setError("Your account has been deactivated. Contact your administrator.")
        return false
      }

      setUser(profile)
      return true
    } catch {
      setError("Connection error. Please check your internet connection.")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const changePassword = async (newPassword: string) => {
    if (newPassword.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." }
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) return { ok: false, error: updateError.message }
    return { ok: true }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isLoading, isAuthLoading, error }}>
      {children}
    </AuthContext.Provider>
  )
}
