"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { changePassword } = useAuth()
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const close = (next: boolean) => {
    if (!next) {
      setPassword("")
      setConfirm("")
      setError("")
    }
    onOpenChange(next)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setSaving(true)
    const result = await changePassword(password)
    setSaving(false)
    if (!result.ok) {
      setError(result.error || "Could not change password.")
      return
    }
    toast({ title: "Password changed", description: "Use your new password next time you sign in." })
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Choose a password with at least 8 characters.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72}
              value={password} onChange={(e) => { setPassword(e.target.value); setError("") }} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72}
              value={confirm} onChange={(e) => { setConfirm(e.target.value); setError("") }} required />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Change Password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
