"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { BrandMark } from "@/components/brand-mark"
import { useAuth } from "@/contexts/auth-context"
import { isSupabaseConfigured } from "@/lib/supabase"
import { APP_NAME } from "@/lib/brand"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [demoLoading, setDemoLoading] = useState<"admin" | "employee" | null>(null)
  const { login, loginDemo, error: authError } = useAuth()
  const shownError = error || (submitted ? authError : "") || ""
  const router = useRouter()

  const clearError = () => {
    setError("")
    setSubmitted(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSubmitted(true)
    try {
      const success = await login(email, password)
      if (success) {
        router.push("/dashboard")
      } else {
        setIsLoading(false)
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const handleDemo = async (role: "admin" | "employee") => {
    setDemoLoading(role)
    setError("")
    setSubmitted(true)
    if (await loginDemo(role)) router.push("/dashboard")
    else setDemoLoading(null)
  }

  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background px-5 py-10">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-[22rem]">
        <header className="mb-8 flex flex-col items-center text-center">
          <BrandMark showWordmark={false} className="[&_svg]:size-10" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to {APP_NAME} to continue.</p>
        </header>

        {!isSupabaseConfigured && (
          <p role="alert" className="mb-5 rounded-lg bg-warning-soft px-3.5 py-2.5 text-xs leading-relaxed text-warning-soft-foreground">
            No database connected. Add the Supabase keys to <code className="font-mono">.env.local</code> and restart, or use the demo below.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="name@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError() }}
              required
              aria-invalid={!!shownError}
              aria-describedby={shownError ? "login-error" : undefined}
              className="h-11"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(v => !v)}
                aria-expanded={showForgotPassword}
                aria-controls="forgot-help"
                className="rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError() }}
                required
                aria-invalid={!!shownError}
                aria-describedby={shownError ? "login-error" : undefined}
                className="h-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {showForgotPassword && (
              <p id="forgot-help" className="pt-1 text-xs leading-relaxed text-muted-foreground">
                Ask your administrator for a temporary password. You can change it later from the key icon in the top bar.
              </p>
            )}
          </div>

          {shownError && (
            <p id="login-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{shownError}</span>
            </p>
          )}

          <Button type="submit" disabled={isLoading} className="mt-2 h-11 w-full font-medium">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="my-7 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          or try the demo
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button type="button" variant="outline" disabled={demoLoading !== null} onClick={() => handleDemo("admin")} className="h-11">
            {demoLoading === "admin" ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="mr-2 size-4" aria-hidden="true" />}
            As admin
          </Button>
          <Button type="button" variant="outline" disabled={demoLoading !== null} onClick={() => handleDemo("employee")} className="h-11">
            {demoLoading === "employee" ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <UserRound className="mr-2 size-4" aria-hidden="true" />}
            As employee
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No account needed. Demo data stays in this browser.
        </p>
      </div>
    </main>
  )
}
