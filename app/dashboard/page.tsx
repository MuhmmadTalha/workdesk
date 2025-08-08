"use client"

import { useAuth } from "@/contexts/auth-context"
import { AdminDashboard } from "@/components/admin-dashboard"
import { EmployeeDashboard } from "@/components/employee-dashboard"
import { LoadingScreen } from "@/components/loading-screen"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardPage() {
  const { user, logout, isAuthLoading } = useAuth()
  const router = useRouter()
  const [showDashboard, setShowDashboard] = useState(false)

  useEffect(() => {
    if (!user && !isAuthLoading) {
      router.push("/login")
    } else if (user && !isAuthLoading) {
      // Add slight delay to show smooth transition
      setTimeout(() => {
        setShowDashboard(true)
      }, 200)
    }
  }, [user, isAuthLoading, router])

  const handleLogout = () => {
    // Add exit animation before logout
    setShowDashboard(false)
    setTimeout(() => {
      logout()
    }, 300)
  }

  // Enhanced page transition animations
  const pageVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.95,
      y: 20 
    },
    in: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    out: { 
      opacity: 0, 
      scale: 1.05,
      y: -20,
      transition: {
        duration: 0.3,
        ease: "easeIn"
      }
    }
  }

  // Role-based transition variants
  const adminVariants = {
    initial: { 
      opacity: 0, 
      x: -50,
      rotateY: -10
    },
    in: { 
      opacity: 1, 
      x: 0,
      rotateY: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    out: { 
      opacity: 0, 
      x: 50,
      rotateY: 10,
      transition: {
        duration: 0.4,
        ease: "easeIn"
      }
    }
  }

  const employeeVariants = {
    initial: { 
      opacity: 0, 
      x: 50,
      rotateY: 10
    },
    in: { 
      opacity: 1, 
      x: 0,
      rotateY: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    },
    out: { 
      opacity: 0, 
      x: -50,
      rotateY: -10,
      transition: {
        duration: 0.4,
        ease: "easeIn"
      }
    }
  }

  // Show loading screen if authenticating
  if (isAuthLoading) {
    return <LoadingScreen isLoading={true}>{null}</LoadingScreen>
  }

  if (!user) {
    return (
      <motion.div 
        className="min-h-screen flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    )
  }

  // Route based on user role with enhanced animations
  return (
    <AnimatePresence mode="wait">
      {showDashboard && (
        <motion.div
          key={`dashboard-${user.role}`}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          className="min-h-screen"
        >
          {user.role === "admin" ? (
            <motion.div
              variants={adminVariants}
              initial="initial"
              animate="in"
              exit="out"
              className="h-full"
            >
              <AdminDashboard user={user} onLogout={handleLogout} />
            </motion.div>
          ) : (
            <motion.div
              variants={employeeVariants}
              initial="initial"
              animate="in"
              exit="out"
              className="h-full"
            >
              <EmployeeDashboard user={user} onLogout={handleLogout} />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
