import { memo } from "react"
import { Check, Minus, OctagonAlert, Pause, X } from "@/components/icons"
import { cn } from "@/lib/utils"
import type { CheckpointStatus, SubStepStatus } from "@/lib/project-workflow"

const SIZE = { sm: 22, md: 40, lg: 48 } as const

/**
 * Circular checkpoint. State is carried by shape and icon as well as colour:
 *  completed  — filled navy disc with a check
 *  in progress — white disc, progress ring, step number
 *  blocked    — amber disc with a pause icon and amber ring
 *  cancelled  — red disc with a cross
 *  skipped    — dashed grey outline with a dash
 *  not started — thin grey outline with the step number
 */
export const CheckpointNode = memo(function CheckpointNode({
  status, progress = 0, number, size = "md", current = false, className,
}: { status: CheckpointStatus; progress?: number; number: number; size?: keyof typeof SIZE; current?: boolean; className?: string }) {
  const px = SIZE[size]
  const stroke = size === "sm" ? 2.5 : 3.5
  const r = (px - stroke) / 2
  const circ = 2 * Math.PI * r
  const ring = status === "in_progress" || status === "blocked"
  const icon = size === "sm" ? "size-3" : "size-[18px]"
  const text = size === "sm" ? "text-[10px]" : size === "md" ? "text-sm" : "text-base"
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums transition",
        status === "completed" && "bg-primary-dark text-white",
        status === "in_progress" && "bg-card text-primary-dark",
        status === "blocked" && "bg-warning-soft text-warning",
        status === "failed" && "bg-danger-soft text-danger ring-2 ring-danger/50 ring-inset",
        status === "skipped" && "border-2 border-dashed border-muted-foreground/35 bg-muted text-muted-foreground",
        status === "not_started" && "border-2 border-input bg-card text-muted-foreground",
        current && size !== "sm" && "shadow-[0_0_0_5px_rgb(30_86_200/0.12)]",
        current && status === "blocked" && size !== "sm" && "shadow-[0_0_0_5px_rgb(180_83_9/0.14)]",
        text,
        className,
      )}
      style={{ width: px, height: px }}
    >
      {ring && (
        <svg className="absolute inset-0 -rotate-90" width={px} height={px} viewBox={`0 0 ${px} ${px}`}>
          <circle cx={px / 2} cy={px / 2} r={r} fill="none" strokeWidth={stroke} className={status === "blocked" ? "stroke-warning/25" : "stroke-primary-strong/15"} />
          <circle
            cx={px / 2} cy={px / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
            className={status === "blocked" ? "stroke-warning" : "stroke-primary-strong"}
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - Math.max(0.06, Math.min(1, progress / 100)))}
          />
        </svg>
      )}
      {status === "completed" ? <Check className={icon} strokeWidth={3} />
        : status === "blocked" ? <Pause className={icon} strokeWidth={2.5} />
          : status === "failed" ? <X className={icon} strokeWidth={3} />
            : status === "skipped" ? <Minus className={icon} strokeWidth={3} />
              : <span className="relative">{number}</span>}
    </span>
  )
})

/** Small status glyph for substeps. */
export const SubStepIcon = memo(function SubStepIcon({ status, className }: { status: SubStepStatus; className?: string }) {
  const base = cn("flex size-5 shrink-0 items-center justify-center rounded-full", className)
  switch (status) {
    case "done": return <span aria-hidden className={cn(base, "bg-primary-dark text-white")}><Check className="size-3" strokeWidth={3} /></span>
    case "current": return <span aria-hidden className={cn(base, "border-2 border-primary-strong bg-card")}><span className="size-2 rounded-full bg-primary-strong" /></span>
    case "blocked": return <span aria-hidden className={cn(base, "bg-warning-soft text-warning")}><OctagonAlert className="size-3.5" /></span>
    case "failed": return <span aria-hidden className={cn(base, "bg-danger-soft text-danger")}><X className="size-3" strokeWidth={3} /></span>
    case "skipped": return <span aria-hidden className={cn(base, "border-2 border-dashed border-muted-foreground/40 text-muted-foreground")}><Minus className="size-2.5" strokeWidth={3} /></span>
    default: return <span aria-hidden className={cn(base, "border-2 border-input bg-card")} />
  }
})
