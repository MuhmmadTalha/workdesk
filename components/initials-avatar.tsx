import { cn } from "@/lib/utils"

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"

// A small fixed palette so the same person always gets the same color.
const palette = [
  "bg-brand-soft text-brand",
  "bg-info-soft text-info-soft-foreground",
  "bg-success-soft text-success-soft-foreground",
  "bg-warning-soft text-warning-soft-foreground",
  "bg-danger-soft text-danger-soft-foreground",
]

function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function InitialsAvatar({
  name,
  size = "md",
  className,
  title,
}: {
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      aria-hidden={title ? undefined : true}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-11 text-sm",
        palette[hash(name) % palette.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
