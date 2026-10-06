import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CalendarPlus, Check, CircleX, MapPinned, Reschedule } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatDate, relativeDay } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ProjectRow, VisitRow } from "@/services"
import { useVisits } from "@/features/execution/hooks"
import { VisitDateTile, VisitTypeBadge } from "./VisitBits"
import { useVisitDialogs } from "./useVisitDialogs"

const SHOWN = 4

/**
 * "Visits" button for the job step. The badge counts every visit on the project; the popover shows the
 * 4 most relevant (next upcoming first, then the latest past ones) with complete / reschedule / cancel on
 * upcoming ones. The full list is on the project's Visits tab.
 */
export function VisitsPopover({ p, onSchedule, className }: { p: ProjectRow; onSchedule?: () => void; className?: string }) {
  const q = useVisits(p.id)
  const canEdit = usePermission("visits", "edit") && !p.locked
  const visit = useVisitDialogs()
  const [open, setOpen] = useState(false)
  const all = useMemo(() => q.data ?? [], [q.data])
  const upcoming = all.filter((v) => v.status === "Upcoming")
  const past = all.filter((v) => v.status !== "Upcoming").sort((a, b) => b.date.localeCompare(a.date))
  const shown = [...[...upcoming].sort((a, b) => a.date.localeCompare(b.date)), ...past].slice(0, SHOWN)
  // run the action after the popover has closed, so focus moves cleanly to the dialog
  const act = (fn: (v: VisitRow) => void, v: VisitRow) => { setOpen(false); setTimeout(() => fn(v), 0) }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={className} aria-label={`Visits: ${all.length} in total, ${upcoming.length} upcoming`}>
            <MapPinned /> Visits
            <span className={cn("ml-0.5 flex h-5 min-w-5 items-center justify-center rounded px-1 text-[11px] font-semibold tabular-nums", all.length ? "bg-primary-dark text-white" : "bg-muted text-muted-foreground")}>{q.isPending ? "…" : all.length}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(26rem,calc(100vw-2rem))] gap-0 p-0">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Visits · {p.code}</p>
              <p className="text-xs text-muted-foreground">{all.length} total · {upcoming.length} upcoming · {all.filter((v) => v.status === "Completed").length} completed</p>
            </div>
            {onSchedule && canEdit && <Button size="sm" onClick={() => { setOpen(false); onSchedule() }}><CalendarPlus /> Schedule</Button>}
          </div>

          <div>
            {q.isPending ? <div className="flex justify-center p-6"><Spinner /></div> : !all.length ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No visits yet. Job days appear once the job is scheduled.</p>
            ) : (
              <ul className="divide-y">
                {shown.map((v) => <Row key={v.id} v={v} canEdit={canEdit} onComplete={() => act(visit.complete, v)} onReschedule={() => act(visit.reschedule, v)} onCancel={() => act(visit.cancel, v)} />)}
              </ul>
            )}
          </div>

          <div className="border-t px-4 py-2">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between"><Link to={`/projects/${p.id}?tab=visits`} onClick={() => setOpen(false)}>{all.length > SHOWN ? `View all ${all.length} visits` : "Manage visits"} <ArrowRight /></Link></Button>
          </div>
        </PopoverContent>
      </Popover>
      {visit.dialogs}
    </>
  )
}

function Row({ v, canEdit, onComplete, onReschedule, onCancel }: { v: VisitRow; canEdit: boolean; onComplete?: () => void; onReschedule?: () => void; onCancel?: () => void }) {
  const moved = v.reschedules?.length ? v.reschedules[v.reschedules.length - 1]! : null
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <VisitDateTile date={v.date} muted={v.status === "Cancelled"} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <VisitTypeBadge type={v.type} />
          {v.status !== "Upcoming" && <StatusBadge status={v.status} />}
        </div>
        <p className="text-xs text-muted-foreground">{v.status === "Upcoming" ? relativeDay(v.date) : formatDate(v.date)}{v.status === "Completed" && v.unitsSpent ? ` · ${v.unitsSpent} ${v.unitLabel.toLowerCase()}` : ""}</p>
        {moved && <p className="truncate text-[11px] text-warning" title={moved.reason}>Moved from {formatDate(moved.from, "dd MMM")} · {moved.reason}</p>}
      </div>
      {canEdit && v.status === "Upcoming" && (
        <div className="flex shrink-0 items-center gap-0.5">
          <IconAction label="Complete visit" onClick={onComplete} tone="success"><Check /></IconAction>
          <IconAction label="Reschedule" onClick={onReschedule} tone="info"><Reschedule /></IconAction>
          <IconAction label="Cancel visit" onClick={onCancel} tone="danger"><CircleX /></IconAction>
        </div>
      )}
    </li>
  )
}

const TONE = {
  success: "bg-success-soft text-success hover:bg-success hover:text-white",
  info: "bg-info-soft text-info hover:bg-info hover:text-white",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
}

function IconAction({ label, onClick, tone, children }: { label: string; onClick?: () => void; tone: keyof typeof TONE; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("size-8 rounded-md", TONE[tone])} onClick={onClick} aria-label={label}>{children}</Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
