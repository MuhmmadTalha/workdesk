"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/loading-screen'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return <LoadingScreen label="Redirecting to sign in…" />
}
