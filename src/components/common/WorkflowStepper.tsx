import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface Step {
  label: string
  hint?: string
}

/** Horizontal stepper on desktop, compact vertical list on mobile. */
export function WorkflowStepper({ steps, current, failedAt, className }: { steps: Step[]; current: number; failedAt?: number; className?: string }) {
  return (
    <ol className={cn("grid gap-3 sm:grid-flow-col sm:auto-cols-fr sm:gap-2", className)} aria-label="Workflow progress">
      {steps.map((s, i) => {
        const failed = failedAt === i
        const done = i < current && !failed
        const active = i === current && !failed
        return (
          <li key={s.label} className="flex items-start gap-3 sm:flex-col sm:gap-2" aria-current={active ? "step" : undefined}>
            <div className="flex items-center gap-2 sm:w-full">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary-soft text-primary-text ring-4 ring-primary/15",
                  failed && "border-danger bg-danger-soft text-danger",
                  !done && !active && !failed && "bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : failed ? <X className="size-4" /> : i + 1}
              </span>
              {i < steps.length - 1 && <span className={cn("hidden h-0.5 flex-1 rounded sm:block", i < current ? "bg-primary" : "bg-border")} aria-hidden />}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", (active || done) ? "text-foreground" : "text-muted-foreground", failed && "text-danger")}>{failed ? "Lost" : s.label}</p>
              {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
