"use client"

"use client"
import LoginForm from "@/components/login-form"

import { ThemeToggle } from "@/components/ui/theme-toggle"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen">
      <ThemeToggle />
      <div className="flex items-center justify-center min-h-screen">
        <LoginForm />
      </div>
    </div>
  )
}
