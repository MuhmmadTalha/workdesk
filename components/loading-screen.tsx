"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import RippleGrid from "@/components/ripple-grid"

interface LoadingScreenProps {
  children: React.ReactNode
  isLoading: boolean
  duration?: number
}

export function LoadingScreen({ children, isLoading, duration = 5000 }: LoadingScreenProps) {
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setShowLoading(true)
      const timer = setTimeout(() => {
        setShowLoading(false)
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isLoading, duration])

  if (showLoading) {
    return (
      <div className="fixed inset-0 z-50 w-full h-full">
        {/* New RippleGrid Background - Full coverage with consistent speed */}
        <div className="fixed inset-0 w-full h-full">
          <RippleGrid 
            opacity={0.6}
            gridColor="#8b5cf6"
            rippleIntensity={0.04}
            gridSize={6.0}
            gridThickness={8.0}
            glowIntensity={0.2}
            mouseInteraction={true}
          />
        </div>

        {/* Base background gradient */}
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-violet-50/80 via-purple-50/70 to-indigo-50/80 dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 z-10" />

        {/* Enhanced overlay for better ripple visibility */}
        <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-violet-900/15 via-purple-900/10 to-indigo-900/15 dark:from-violet-400/8 dark:via-purple-400/6 dark:to-indigo-400/8 z-20" />

        {/* Loading content */}
        <div className="relative z-30 flex items-center justify-center min-h-screen w-full">
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Logo */}
            <motion.div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <svg className="h-10 w-10 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0v-4M9 7h6m-6 4h6m-6 4h6" />
              </svg>
            </motion.div>
            
            {/* Text */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">Gen-T AI Solutions</h2>
              <p className="text-gray-600 dark:text-gray-300">Loading your workspace...</p>
            </motion.div>

            {/* Loading dots */}
            <motion.div
              className="flex justify-center space-x-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="h-3 w-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
