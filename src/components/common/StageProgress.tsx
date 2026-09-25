import { memo, type ComponentType } from "react"
import {
  AlertTriangle, Ban, BadgeCheck, CalendarClock, CheckCircle2, ClipboardList, FileCheck2, FileClock, Hammer, Hourglass, MailQuestion, Send, Tag, UserCheck,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { BILLING_STEPS, STAGES, type BillingInsight } from "@/lib/workflow"
import { cn } from "@/lib/utils"
import type { ProjectStage } from "@/types/domain"

type Tone = { pill: string; bar: string }
const T = {
  neutral: { pill: "bg-neutral-soft text-neutral", bar: "bg-[#64748b]" },
  sky: { pill: "bg-info-soft text-info", bar: "bg-[#07a3e7]" },
  violet: { pill: "bg-violet-soft text-violet", bar: "bg-[#6d5bd0]" },
  amber: { pill: "bg-warning-soft text-warning", bar: "bg-[#d97706]" },
  royal: { pill: "bg-[#e6ecfb] text-[#1e56c8]", bar: "bg-[#1e56c8]" },
  green: { pill: "bg-success-soft text-success", bar: "bg-[#16a34a]" },
  red: { pill: "bg-danger-soft text-danger", bar: "bg-danger/40" },
} satisfies Record<string, Tone>

interface FlowProps {
  steps: readonly { label: string }[]
  /** current step index; -1 = cancelled */
  index: number
  complete: boolean
  label: string
  icon: ComponentType<{ className?: string }>
  tone: Tone
  checkpoint: string
  blocked?: string | null
  className?: string
}

/**
 * Listing cell for where a record stands in a flow:
 *   [icon Step name]  ·  step n/N
 *   ▰▰▰▰▱▱  segmented bar (done = filled, current = half, upcoming = empty; tooltip per step)
 *   checkpoint text, plus an amber line with a warning icon when blocked
 */
export const FlowProgress = memo(function FlowProgress({ steps, index, complete, label, icon: Icon, tone, checkpoint, blocked, className }: FlowProps) {
  const cancelled = index < 0
  return (
    <div className={cn("w-64 max-w-full space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", tone.pill)}>
          <Icon className="size-3.5" aria-hidden />
          {label}
        </span>
        {!cancelled && <span className="text-[11px] font-medium text-muted-foreground tabular-nums">Step {index + 1} of {steps.length}</span>}
      </div>
      <ol className="flex gap-1" aria-label={cancelled ? "Cancelled" : `Step ${index + 1} of ${steps.length}: ${label}`}>
        {steps.map((s, i) => {
          const state = cancelled ? "off" : complete || i < index ? "done" : i === index ? "current" : "todo"
          return (
            <li key={s.label} className="flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block py-1" tabIndex={-1}>
                    <span className={cn("relative block h-1.5 overflow-hidden rounded-full bg-muted", state === "off" && "bg-danger-soft")}>
                      {state === "done" && <span className={cn("absolute inset-0 rounded-full", tone.bar)} />}
                      {state === "current" && <span className={cn("absolute inset-y-0 left-0 w-1/2 rounded-full", tone.bar)} />}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {i + 1}. {s.label}
                  {state === "done" ? " — done" : state === "current" ? " — in progress" : ""}
                </TooltipContent>
              </Tooltip>
            </li>
          )
        })}
      </ol>
      <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground" title={checkpoint}>{checkpoint}</p>
      {blocked && (
        <p className="flex items-start gap-1 text-[11px] font-medium whitespace-normal text-warning" title={blocked}>
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          <span className="line-clamp-1">{blocked}</span>
        </p>
      )}
    </div>
  )
})

const JOB_ICONS = [ClipboardList, MailQuestion, Send, UserCheck, CalendarClock, FileCheck2]
const JOB_TONES: Record<string, Tone> = {
  Inquiry: T.neutral, "Inspector Assigned": T.sky, "CVs Sent": T.violet, "Inspector Confirmed": T.amber, "Job Scheduled": T.royal, Completed: T.green, Cancelled: T.red,
}
const JOB_STEPS = STAGES.map((s) => ({ label: s.stage }))

/** Job workflow (6 stages) — Coordinator / Super Admin view. */
export const StageProgress = memo(function StageProgress({ stage, checkpoint, blocked, className }: { stage: ProjectStage; checkpoint: string; blocked?: string | null; className?: string }) {
  const cancelled = stage === "Cancelled"
  const done = stage === "Completed"
  const index = cancelled ? -1 : STAGES.findIndex((s) => s.stage === stage)
  return (
    <FlowProgress
      steps={JOB_STEPS}
      index={index}
      complete={done}
      label={cancelled ? "Cancelled" : STAGES[index]?.short ?? stage}
      icon={cancelled ? Ban : done ? CheckCircle2 : JOB_ICONS[index] ?? ClipboardList}
      tone={JOB_TONES[stage] ?? T.neutral}
      checkpoint={checkpoint}
      blocked={blocked}
      className={className}
    />
  )
})

const BILL_ICONS = [Tag, Hammer, FileClock, Hourglass, BadgeCheck]
const BILL_TONES = [T.violet, T.sky, T.amber, T.royal, T.green]
const BILL_STEPS = BILLING_STEPS.map((s) => ({ label: s.short }))

/** Invoice flow (5 steps) — Accountant view. */
export const BillingProgress = memo(function BillingProgress({ insight, className }: { insight: BillingInsight; className?: string }) {
  const cancelled = insight.index < 0
  const overdue = insight.index === 3 && insight.due?.tone === "danger"
  return (
    <FlowProgress
      steps={BILL_STEPS}
      index={insight.index}
      complete={insight.index === 4}
      label={overdue ? "Overdue" : insight.label}
      icon={cancelled ? Ban : BILL_ICONS[insight.index] ?? Tag}
      tone={cancelled ? T.red : overdue ? T.red : BILL_TONES[insight.index] ?? T.neutral}
      checkpoint={insight.checkpoint}
      blocked={insight.blocked}
      className={className}
    />
  )
})
