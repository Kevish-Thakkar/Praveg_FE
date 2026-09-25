import { memo } from "react"
import { cn } from "@/lib/utils"
import { TONE_CLASSES, toneFor, type Tone } from "@/constants/status"

interface StatusBadgeProps {
  status: string
  tone?: Tone
  className?: string
  dot?: boolean
}

export const StatusBadge = memo(function StatusBadge({ status, tone, className, dot = true }: StatusBadgeProps) {
  const t = tone ?? toneFor(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[t],
        className,
      )}
    >
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {status}
    </span>
  )
})
