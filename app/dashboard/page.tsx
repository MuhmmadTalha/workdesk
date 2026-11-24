"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { AdminDashboard } from "@/components/admin-dashboard"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { LoadingScreen } from "@/components/loading-screen"

export default function DashboardPage() {
  const { user, logout, isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user && !isAuthLoading) router.replace("/login")
  }, [user, isAuthLoading, router])

  if (isAuthLoading || !user) {
    return <LoadingScreen label={isAuthLoading ? "Loading your workspace…" : "Redirecting…"} />
  }

  return (
    <motion.div
      key={user.role}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-svh"
    >
      {user.role === "admin"
        ? <AdminDashboard user={user} onLogout={logout} />
        : <EmployeeDashboard user={user} onLogout={logout} />}
    </motion.div>
  )
}
