import type { ReactNode } from "react"
import { Check, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type StepState = "done" | "current" | "upcoming"

interface StepCardProps {
  id: string
  number: number
  title: string
  state: StepState
  summary?: ReactNode
  actions?: ReactNode
  highlight?: boolean
  children?: ReactNode
}

/** One workflow step on the project page. Done steps collapse to a summary, the current step is expanded. */
export function StepCard({ id, number, title, state, summary, actions, highlight, children }: StepCardProps) {
  return (
    <Card id={id} className={cn("scroll-mt-24 gap-0 py-0 transition-shadow", state === "current" && "border-primary/50 ring-4 ring-primary/10", highlight && "ring-4 ring-warning/30")}>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              state === "done" && "bg-primary text-white",
              state === "current" && "bg-gradient-to-br from-[#07a3e7] to-[#1e56c8] text-white",
              state === "upcoming" && "bg-muted text-muted-foreground",
            )}
          >
            {state === "done" ? <Check className="size-4" strokeWidth={3} /> : state === "upcoming" ? <Lock className="size-3.5" /> : number}
          </span>
          <div className="min-w-0">
            <h3 className={cn("font-semibold", state === "upcoming" && "text-muted-foreground")}>{title}</h3>
            {summary && <div className="text-sm text-muted-foreground">{summary}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>}
      </div>
      {children && state !== "upcoming" && <div className="border-t px-4 py-4 sm:px-5">{children}</div>}
    </Card>
  )
}

export function stepState(stepIndex: number, currentIndex: number, completed: boolean): StepState {
  if (completed || stepIndex < currentIndex) return "done"
  if (stepIndex === currentIndex) return "current"
  return "upcoming"
}
