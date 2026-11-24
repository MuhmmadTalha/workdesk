"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LoginForm from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const { user, isAuthLoading } = useAuth()
  const router = useRouter()

  // Already signed in → go straight to the dashboard.
  useEffect(() => {
    if (!isAuthLoading && user) router.replace("/dashboard")
  }, [user, isAuthLoading, router])

  return <LoginForm />
}
