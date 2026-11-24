"use client"

import { useRef, useState, type ReactNode, type KeyboardEvent, type PointerEvent, type MouseEvent } from "react"
import { Reorder, useDragControls, type DragControls } from "framer-motion"
import { Move, ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/** Text colour for the drag handle, matching each priority's colour stripe. */
export const priorityHandleTone: Record<string, string> = {
  Low: "text-muted-foreground",
  Medium: "text-info",
  High: "text-warning",
  Critical: "text-destructive",
}

export type MoveTarget = "top" | "up" | "down" | "bottom"

/**
 * Sort value for an item dropped at `index` in `list` (lower = higher up).
 * Lands halfway between its new neighbours, so only the moved item is saved.
 */
export function sortValueAt(list: number[], index: number): number {
  const before = list[index - 1]
  const after = list[index + 1]
  if (before !== undefined && after !== undefined) return (before + after) / 2
  if (before !== undefined) return before + 1
  if (after !== undefined) return after - 1
  return 0
}

/** Moves `id` to position `to` in `ids` and returns the new array. */
export function moveIdTo(ids: string[], id: string, to: number): string[] {
  const from = ids.indexOf(id)
  if (from < 0 || to < 0 || to >= ids.length || from === to) return ids
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, id)
  return next
}

/** Moves `id` by `step` positions in `ids` (unchanged at the ends). */
export function shiftId(ids: string[], id: string, step: number): string[] {
  return moveIdTo(ids, id, ids.indexOf(id) + step)
}

/** The new order of `ids` after moving `id` to `target`. */
export function reorderIds(ids: string[], id: string, target: MoveTarget): string[] {
  switch (target) {
    case "top": return moveIdTo(ids, id, 0)
    case "bottom": return moveIdTo(ids, id, ids.length - 1)
    case "up": return shiftId(ids, id, -1)
    case "down": return shiftId(ids, id, 1)
  }
}

interface SortableItemProps {
  id: string
  as?: "li" | "div" | "tr"
  className?: string
  onDragStart?: () => void
  onDragEnd?: () => void
  children: (controls: DragControls, dragging: boolean) => ReactNode
}

/** A list row that can only be dragged by its handle (so buttons and text inside still work). */
export function SortableItem({ id, as = "div", className, onDragStart, onDragEnd, children }: SortableItemProps) {
  const controls = useDragControls()
  const [dragging, setDragging] = useState(false)
  return (
    <Reorder.Item
      value={id}
      as={as}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => { setDragging(true); onDragStart?.() }}
      onDragEnd={() => { setDragging(false); onDragEnd?.() }}
      className={className}
      style={{ position: "relative" }}
      whileDrag={{ scale: 1.01, boxShadow: "0 12px 28px rgba(0,0,0,0.25)", zIndex: 20 }}
    >
      {children(controls, dragging)}
    </Reorder.Item>
  )
}

/**
 * The hover target that reveals the handle: hovering anywhere in this zone
 * (the task's left corner) fades the handle in.
 */
export function HandleZone({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("group/grip cursor-grab", className)}>{children}</div>
}

interface DragHandleProps {
  controls: DragControls
  /** Task title, for the accessible name. */
  title: string
  priority: string
  isFirst: boolean
  isLast: boolean
  /** Keep the handle visible (e.g. while its item is being dragged). */
  active?: boolean
  className?: string
  onMoveTo: (target: MoveTarget) => void
}

const CLICK_SLOP_PX = 4

/**
 * Four-way "move" handle. Hidden until its HandleZone is hovered (always shown on
 * touch screens, on keyboard focus and while in use).
 * - Drag it to reorder.
 * - Click it (without dragging) for Move to top / up / down / bottom.
 * - Focus it and press the arrow keys to move one step.
 */
export function DragHandle({ controls, title, priority, isFirst, isLast, active, className, onMoveTo }: DragHandleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pressAt = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    pressAt.current = { x: e.clientX, y: e.clientY }
    // Stops text selection and Radix's own open-on-press; we open the menu on click instead.
    e.preventDefault()
    controls.start(e)
  }
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const start = pressAt.current
    pressAt.current = null
    const moved = start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_SLOP_PX
    if (!moved) setMenuOpen(true)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); if (!isFirst) onMoveTo("up") }
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); if (!isLast) onMoveTo("down") }
  }

  const visible = active || menuOpen

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Move "${title}". Drag, click for options, or use the arrow keys.`}
          title="Drag to reorder, or click for options"
          data-active={visible ? "true" : undefined}
          onPointerDown={onPointerDown}
          onClick={onClick}
          onKeyDown={onKeyDown}
          style={{ touchAction: "none" }}
          className={cn(
            "grid size-7 shrink-0 cursor-grab place-items-center rounded-md outline-none active:cursor-grabbing",
            "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
            // Hidden until the left corner is hovered; always shown on touch, focus and while in use.
            "opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none",
            "group-hover/grip:opacity-100 focus-visible:opacity-100 data-[active=true]:opacity-100 data-[active=true]:bg-muted",
            "[@media(hover:none)]:opacity-100",
            priorityHandleTone[priority] ?? priorityHandleTone.Low,
            className,
          )}
        >
          <Move className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" sideOffset={6} className="w-44">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Move task</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveTo("top")}>
          <ArrowUpToLine aria-hidden="true" />Move to top
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isFirst} onSelect={() => onMoveTo("up")}>
          <ArrowUp aria-hidden="true" />Move up
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast} onSelect={() => onMoveTo("down")}>
          <ArrowDown aria-hidden="true" />Move down
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isLast} onSelect={() => onMoveTo("bottom")}>
          <ArrowDownToLine aria-hidden="true" />Move to bottom
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { Reorder }
