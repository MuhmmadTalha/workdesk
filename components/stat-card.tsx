import type { LucideIcon } from "lucide-react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

export type Tone = "brand" | "success" | "warning" | "info" | "danger" | "neutral"

const toneChip: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  info: "bg-info-soft text-info-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
  neutral: "bg-muted text-muted-foreground",
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "brand",
  empty = false,
  onClick,
  valueClassName,
}: {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  hint?: React.ReactNode
  tone?: Tone
  /** Render a muted "No data yet" instead of the value. */
  empty?: boolean
  onClick?: () => void
  valueClassName?: string
}) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-4 text-left text-card-foreground sm:p-5",
        "shadow-[0_1px_2px_rgb(15_23_42/0.04),0_1px_3px_rgb(15_23_42/0.06)] dark:shadow-none",
        onClick &&
          "cursor-pointer outline-none transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:hover:translate-y-0",
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", toneChip[tone])}>
            <Icon className="size-[18px]" aria-hidden="true" />
          </span>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">{label}</p>
        {onClick && (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        )}
      </div>
      {empty ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className={cn("mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl", valueClassName)}>
          {value}
        </div>
      )}
      {hint && !empty && <div className="mt-1 truncate text-xs text-muted-foreground">{hint}</div>}
    </Comp>
  )
}
