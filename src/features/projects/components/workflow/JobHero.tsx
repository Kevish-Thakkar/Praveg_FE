import { ArrowRight, CircleAlert, ClipboardList, FileCheck2, MailQuestion, Send, CalendarClock, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { TONE_CLASSES } from "@/constants/status"
import { STAGES } from "@/lib/workflow"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"

const ICONS = [ClipboardList, MailQuestion, Send, UserCheck, CalendarClock, FileCheck2]

/** Top of the project page: 6-step progress + the one thing to do next. */
export function JobHero({ p, onAction, cta }: { p: ProjectRow; onAction: (key: string) => void; cta: { show: boolean; label: string } }) {
  const current = p.insight.index
  const cancelled = p.stage === "Cancelled"
  const done = p.stage === "Completed"
  const n = p.insight.next
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <ol className="grid grid-cols-3 gap-y-4 px-4 pt-5 pb-4 sm:grid-cols-6 sm:px-6" aria-label="Project progress">
        {STAGES.map((s, i) => {
          const Icon = ICONS[i]!
          const isDone = !cancelled && (i < current || done)
          const active = !cancelled && !done && i === current
          return (
            <li key={s.stage} className="relative flex flex-col items-center gap-2 text-center" aria-current={active ? "step" : undefined}>
              {i < STAGES.length - 1 && <span className={cn("absolute top-5 left-1/2 hidden h-0.5 w-full sm:block", isDone ? "bg-primary" : "bg-border")} aria-hidden />}
              <span
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full border-2 bg-card",
                  isDone && "border-primary bg-primary text-white",
                  active && "border-transparent bg-gradient-to-br from-[#07a3e7] to-[#1e56c8] text-white ring-4 ring-primary/20",
                  !isDone && !active && "text-muted-foreground",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="space-y-0.5">
                <span className={cn("block text-xs font-semibold sm:text-sm", !isDone && !active && "text-muted-foreground")}>{i + 1}. {s.short}</span>
                <span className="hidden text-[11px] leading-tight text-muted-foreground lg:block">{s.hint}</span>
              </span>
            </li>
          )
        })}
      </ol>
      <div className={cn("flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6", cancelled ? "bg-danger-soft/50" : "bg-muted/40")}>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{cancelled ? "Cancelled" : done && n.key === "none" ? "Closed" : "Current checkpoint"}</p>
          <p className="font-medium">{p.insight.checkpoint}</p>
          {p.insight.blocked && <p className="flex items-center gap-1 text-sm text-warning"><CircleAlert className="size-4" aria-hidden /> {p.insight.blocked}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {p.insight.nextDate && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{p.insight.nextDate.label}</p>
              <p className="text-sm font-medium">{formatDate(p.insight.nextDate.date)}</p>
            </div>
          )}
          {p.insight.due && <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", TONE_CLASSES[p.insight.due.tone])}>{p.insight.due.text}</span>}
          {n.key !== "none" && cta.show && (
            <Button onClick={() => onAction(n.key)} className="bg-gradient-to-r from-[#07a3e7] to-[#1e56c8] text-white hover:opacity-95">
              {cta.label} <ArrowRight />
            </Button>
          )}
          {n.key !== "none" && !cta.show && <span className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">Next: {n.label} · {n.owner}</span>}
        </div>
      </div>
    </Card>
  )
}
