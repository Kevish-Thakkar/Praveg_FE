import { memo } from "react"
import { CheckpointNode } from "@/components/workflow/CheckpointNode"
import { STATUS_LABEL, type CheckpointStatus } from "@/lib/project-workflow"
import { cn } from "@/lib/utils"
import type { ProjectStage } from "@/types/domain"

/** The five operations checkpoints, as used on the project page and in the Projects list. */
const STEPS = ["Requirement", "Inspector sourcing", "Inspector onboarding", "Job execution", "Report & completion"]
/** which checkpoint a stage sits in */
const AT: Record<Exclude<ProjectStage, "Cancelled" | "Completed">, number> = {
  Inquiry: 0, "Inspector Assigned": 1, "CVs Sent": 2, "Inspector Confirmed": 2, "Job Scheduled": 3,
}

/**
 * Compact checkpoint track for rows that only know the project stage (client / inspector pages, requests).
 * Same nodes and colours as the checkpoint workflow everywhere else.
 */
export const StageTrack = memo(function StageTrack({ stage, className }: { stage: ProjectStage; className?: string }) {
  const done = stage === "Completed"
  const cancelled = stage === "Cancelled"
  const at = done || cancelled ? -1 : AT[stage]
  const status = (i: number): CheckpointStatus => (done ? "completed" : cancelled ? "skipped" : i < at ? "completed" : i === at ? "in_progress" : "not_started")
  const label = done ? "All steps complete" : cancelled ? "Cancelled" : `Step ${at + 1} of 5: ${STEPS[at]}`
  return (
    <span className={cn("flex items-center", className)} role="img" aria-label={label}>
      {STEPS.map((s, i) => (
        <span key={s} className="flex items-center" title={`${s}: ${STATUS_LABEL[status(i)]}`}>
          <CheckpointNode status={status(i)} progress={40} number={i + 1} size="sm" />
          {i < STEPS.length - 1 && <span aria-hidden className={cn("mx-0.5 h-0.5 w-2.5", status(i) === "completed" ? "bg-primary-dark" : "border-t-2 border-dotted border-input")} />}
        </span>
      ))}
    </span>
  )
})
