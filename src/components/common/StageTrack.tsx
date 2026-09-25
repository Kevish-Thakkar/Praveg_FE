import { memo } from "react"
import { Check } from "lucide-react"
import { STAGES } from "@/lib/workflow"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { ProjectStage } from "@/types/domain"

/** Compact 6-segment progress track for table rows. Each segment has a tooltip with the stage name. */
export const StageTrack = memo(function StageTrack({ stage, className }: { stage: ProjectStage; className?: string }) {
  const current = STAGES.findIndex((s) => s.stage === stage)
  const cancelled = stage === "Cancelled"
  const complete = stage === "Completed"
  return (
    <ol className={cn("flex items-center gap-1", className)} aria-label={`Stage ${cancelled ? "cancelled" : `${current + 1} of ${STAGES.length}: ${stage}`}`}>
      {STAGES.map((s, i) => {
        const done = !cancelled && (i < current || complete)
        const active = !cancelled && !complete && i === current
        return (
          <li key={s.stage} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                    done && "bg-primary text-white",
                    active && "bg-primary-soft text-primary-text ring-2 ring-primary",
                    !done && !active && "bg-muted text-muted-foreground",
                    cancelled && "bg-danger-soft/60 text-danger/60",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                </span>
              </TooltipTrigger>
              <TooltipContent>{i + 1}. {s.stage}</TooltipContent>
            </Tooltip>
            {i < STAGES.length - 1 && <span className={cn("h-0.5 w-2.5", done ? "bg-primary" : "bg-border")} aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
})
