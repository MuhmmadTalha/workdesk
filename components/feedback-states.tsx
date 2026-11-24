import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, House, Inbox, Palmtree, RotateCw, Star, Thermometer, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: {
  title?: string
  message?: React.ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
      <div className="mb-3 grid size-11 place-items-center rounded-full bg-danger-soft">
        <AlertTriangle className="size-5 text-danger-soft-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

/** Page-shaped placeholder: header, optional stat row and list rows. */
export function SectionSkeleton({
  stats = 0,
  rows = 4,
  label = "Loading",
}: {
  stats?: number
  rows?: number
  label?: string
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-full md:w-40" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: stats }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] rounded-xl" />
          ))}
        </div>
      )}
      <div className="space-y-3 rounded-xl border p-4 sm:p-6">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="hidden h-6 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Small tinted pill for task / assignment status. */
export const statusTone: Record<string, string> = {
  Completed: "bg-success-soft text-success-soft-foreground border-success/30",
  "In Progress": "bg-warning-soft text-warning-soft-foreground border-warning/40",
  Pending: "bg-muted text-foreground border-border",
  Cancelled: "bg-danger-soft text-danger-soft-foreground border-destructive/25",
}

export const priorityTone: Record<string, string> = {
  Low: "bg-muted text-muted-foreground border-border",
  Medium: "bg-info-soft text-info-soft-foreground border-info/30",
  High: "bg-warning-soft text-warning-soft-foreground border-warning/40",
  Critical: "bg-danger-soft text-danger-soft-foreground border-destructive/25",
}

export function Pill({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium [&>svg]:size-3",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

const attendanceTone: Record<string, { icon: LucideIcon; className: string }> = {
  present: { icon: CheckCircle2, className: "bg-success-soft text-success-soft-foreground border-success/30" },
  absent: { icon: XCircle, className: "bg-danger-soft text-danger-soft-foreground border-destructive/25" },
  late: { icon: Clock, className: "bg-warning-soft text-warning-soft-foreground border-warning/40" },
  half_day: { icon: CircleDashed, className: "bg-warning-soft text-warning-soft-foreground border-warning/40" },
  sick: { icon: Thermometer, className: "bg-danger-soft text-danger-soft-foreground border-destructive/25" },
  vacation: { icon: Palmtree, className: "bg-info-soft text-info-soft-foreground border-info/30" },
  remote: { icon: House, className: "bg-info-soft text-info-soft-foreground border-info/30" },
}

export function AttendanceBadge({ status, label }: { status: string; label: string }) {
  const tone = attendanceTone[status]
  const Icon = tone?.icon
  return (
    <Pill className={tone?.className ?? "bg-muted text-foreground border-border"}>
      {Icon && <Icon aria-hidden="true" />}
      {label}
    </Pill>
  )
}

/** Read-only 1–5 star rating with an accessible text label. */
export function RatingStars({ value, max = 5, className }: { value: number; max?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-4", i < Math.round(value) ? "fill-warning text-warning" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  )
}
