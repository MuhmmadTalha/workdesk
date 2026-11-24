"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
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
  const { login, error: authError } = useAuth()
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

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-muted/40 px-4 py-12 dark:bg-background">
      {/* Faint dot grid that fades out toward the edges — static, no animation */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 30%, transparent 75%)",
        }}
      />
      {/* In dark mode the dots need a lighter colour than --border to show */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden opacity-[0.08] dark:block"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 45%, black 30%, transparent 75%)",
        }}
      />

      <ThemeToggle className="absolute right-4 top-4" />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandMark showWordmark={false} className="[&_svg]:size-10" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign in to {APP_NAME}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use the email and password from your administrator.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-7">
          {!isSupabaseConfigured && (
            <div role="alert" className="mb-5 rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-3 text-sm text-warning-soft-foreground">
              The app isn&apos;t connected to a database. Set the Supabase keys in <code className="font-mono text-xs">.env.local</code> and restart.
            </div>
          )}

          {shownError && (
            <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/25 bg-danger-soft px-3.5 py-3 text-sm text-danger-soft-foreground">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{shownError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="name@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(v => !v)}
                  aria-expanded={showForgotPassword}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
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
                <p className="rounded-md bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  Ask your administrator to set a new temporary password. Once you&apos;re in, you can change it
                  from the key icon in the top bar.
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className="h-11 w-full text-sm font-medium">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Accounts are created by your administrator.
        </p>
      </div>
    </div>
  )
}
