import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/brand"

/** App logo mark + name. */
export function BrandMark({
  className,
  showWordmark = true,
}: {
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 shrink-0">
        <rect width="32" height="32" rx="8" className="fill-brand" />
        {/* Neutral 2x2 grid mark */}
        <rect x="8.5" y="8.5" width="6.5" height="6.5" rx="1.5" className="fill-brand-foreground" />
        <rect x="17" y="8.5" width="6.5" height="6.5" rx="1.5" className="fill-brand-foreground" opacity="0.55" />
        <rect x="8.5" y="17" width="6.5" height="6.5" rx="1.5" className="fill-brand-foreground" opacity="0.55" />
        <rect x="17" y="17" width="6.5" height="6.5" rx="1.5" className="fill-brand-foreground" />
      </svg>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">{APP_NAME}</span>
      )}
    </span>
  )
}
