import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { TONE_CLASSES } from "@/constants/status"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"

export function DueChip({ p }: { p: ProjectRow }) {
  const d = p.insight
  if (!d.due && !d.nextDate) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <div className="space-y-0.5">
      {d.due && <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap", TONE_CLASSES[d.due.tone])}>{d.due.text}</span>}
      {d.nextDate && <p className="text-xs whitespace-nowrap text-muted-foreground">{d.nextDate.label} {formatDate(d.nextDate.date, "dd MMM")}</p>}
    </div>
  )
}

export function NextAction({ p, compact }: { p: ProjectRow; compact?: boolean }) {
  const n = p.insight.next
  if (n.key === "none") return <span className="flex w-52 max-w-full items-center rounded-lg border border-dashed px-2.5 py-2.5 text-xs text-muted-foreground">{p.stage === "Cancelled" ? "Cancelled" : "No action needed"}</span>
  return (
    <Link
      to={`/projects/${p.id}?action=${n.key}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "group flex w-52 max-w-full items-center justify-between gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left text-xs transition hover:border-primary/60 hover:bg-primary-soft/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        p.insight.blocked && "border-warning/50 bg-warning-soft/40",
      )}
      title={p.insight.blocked ?? undefined}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">{n.label}</span>
        {!compact && <span className="block text-[11px] text-muted-foreground">{n.owner === "Client" || n.owner === "Inspector" ? `Waiting on ${n.owner.toLowerCase()}` : `${n.owner}`}</span>}
      </span>
      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden />
    </Link>
  )
}


