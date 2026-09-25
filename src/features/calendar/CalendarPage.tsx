import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { useVisits } from "@/features/execution/hooks"
import { useProjects } from "@/features/projects/hooks"
import { useIsMobile } from "@/hooks/use-mobile"
import { toISODate } from "@/lib/dates"
import { TONE_CLASSES, type Tone } from "@/constants/status"
import { cn } from "@/lib/utils"

type EventKind = "Job day" | "Follow-up visit" | "Repair visit" | "Client interview" | "Required by"

interface CalEvent {
  id: string
  date: string
  kind: EventKind
  title: string
  subtitle: string
  href: string
  status: string
}

const KIND_TONE: Record<EventKind, Tone> = {
  "Job day": "info",
  "Follow-up visit": "violet",
  "Repair visit": "warning",
  "Client interview": "success",
  "Required by": "neutral",
}

/** Job days, follow-up/repair visits, client interviews and client "required by" dates. */
export function CalendarPage() {
  const isMobile = useIsMobile()
  const visits = useVisits()
  const projects = useProjects()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [view, setView] = useState<"month" | "agenda" | "">("")
  const [openDay, setOpenDay] = useState<string | null>(null)
  const effectiveView = view || (isMobile ? "agenda" : "month")

  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = []
    for (const v of visits.data ?? []) {
      if (v.status === "Cancelled") continue
      const kind: EventKind = v.type === "Inspection" ? "Job day" : `${v.type} visit` as EventKind
      out.push({ id: v.id, date: v.date, kind, title: `${v.projectCode} · ${v.inspectorName}`, subtitle: `${v.clientName}, ${v.location}`, href: `/projects/${v.projectId}`, status: v.status })
    }
    for (const p of projects.data ?? []) {
      if (p.stage === "Cancelled") continue
      if (p.selection?.mode === "Interview" && p.selection.interviewAt && p.selection.interviewResult === "Pending") {
        out.push({ id: `int_${p.id}`, date: toISODate(new Date(p.selection.interviewAt)), kind: "Client interview", title: `${p.code} · interview`, subtitle: `${p.clientName} · ${new Date(p.selection.interviewAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`, href: `/projects/${p.id}`, status: "Pending" })
      }
      if (!p.schedule && p.stage !== "Completed") out.push({ id: `req_${p.id}`, date: p.requiredBy, kind: "Required by", title: `${p.code} · ${p.title}`, subtitle: `${p.clientName} · ${p.stage}`, href: `/projects/${p.id}`, status: p.stage })
    }
    return out.sort((a, b) => a.date.localeCompare(b.date))
  }, [visits.data, projects.data])

  const byDay = useMemo(() => {
    const m = new Map<string, CalEvent[]>()
    events.forEach((e) => m.set(e.date, [...(m.get(e.date) ?? []), e]))
    return m
  }, [events])

  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) }), [month])
  const monthEvents = events.filter((e) => e.date.startsWith(format(month, "yyyy-MM")))
  const loading = visits.isPending || projects.isPending
  const error = visits.error ?? projects.error

  return (
    <PageContainer>
      <PageHeader title="Calendar" description="Job days, follow-up and repair visits, client interviews and client required-by dates." />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month"><ChevronLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month"><ChevronRight /></Button>
            <h2 className="ml-1 text-base font-semibold" aria-live="polite">{format(month, "MMMM yyyy")}</h2>
            <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ul className="hidden flex-wrap gap-2 xl:flex" aria-label="Legend">
              {(Object.keys(KIND_TONE) as EventKind[]).map((k) => <li key={k}><StatusBadge status={k} tone={KIND_TONE[k]} /></li>)}
            </ul>
            <ToggleGroup type="single" variant="outline" value={effectiveView} onValueChange={(v) => v && setView(v as "month" | "agenda")} aria-label="Calendar view">
              <ToggleGroupItem value="month" aria-label="Month view"><CalendarDays /> <span className="hidden sm:inline">Month</span></ToggleGroupItem>
              <ToggleGroupItem value="agenda" aria-label="Agenda view"><List /> <span className="hidden sm:inline">Agenda</span></ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        {loading ? <TableSkeleton rows={6} columns={7} /> : error ? <ErrorState message={error.message} onRetry={() => { void visits.refetch(); void projects.refetch() }} /> : effectiveView === "month" ? (
          <div>
            <div aria-hidden className="grid grid-cols-7 border-b bg-muted/60 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-2 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const iso = toISODate(d)
                const list = byDay.get(iso) ?? []
                const inMonth = isSameMonth(d, month)
                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => list.length && setOpenDay(iso)}
                    aria-label={`${format(d, "d MMMM")}, ${list.length} event${list.length === 1 ? "" : "s"}`}
                    className={cn("flex min-h-28 flex-col items-stretch justify-start border-r border-b p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground", list.length ? "hover:bg-primary-soft/30" : "cursor-default")}
                  >
                    <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-xs font-medium", isToday(d) && "bg-primary text-primary-foreground")}>{format(d, "d")}</span>
                    <span className="mt-1 block space-y-1">
                      {list.slice(0, 3).map((e) => (
                        <span key={e.id} className={cn("block truncate rounded px-1.5 py-0.5 text-[11px] font-medium", TONE_CLASSES[KIND_TONE[e.kind]], e.kind === "Required by" && "border border-dashed border-neutral/40")}>{e.title}</span>
                      ))}
                      {list.length > 3 && <span className="block px-1.5 text-[11px] text-muted-foreground">+{list.length - 3} more</span>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : monthEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title={`Nothing scheduled in ${format(month, "MMMM")}`} description="Use the arrows to move between months." />
        ) : (
          <ol className="divide-y">
            {[...new Set(monthEvents.map((e) => e.date))].map((date) => (
              <li key={date} className="flex gap-4 px-4 py-3">
                <div className={cn("w-12 shrink-0 text-center leading-tight", isToday(parseISO(date)) && "text-primary-text")}>
                  <p className="text-[11px] font-medium uppercase">{format(parseISO(date), "EEE")}</p>
                  <p className="text-xl font-semibold tabular-nums">{format(parseISO(date), "d")}</p>
                </div>
                <ul className="min-w-0 flex-1 space-y-2">{byDay.get(date)!.map((e) => <EventRow key={e.id} e={e} />)}</ul>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <DetailDrawer open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)} title={openDay ? format(parseISO(openDay), "EEEE, d MMMM yyyy") : ""} description={`${byDay.get(openDay ?? "")?.length ?? 0} scheduled item(s)`}>
        <ul className="space-y-2">{(byDay.get(openDay ?? "") ?? []).map((e) => <EventRow key={e.id} e={e} />)}</ul>
      </DetailDrawer>
    </PageContainer>
  )
}

function EventRow({ e }: { e: CalEvent }) {
  return (
    <li>
      <Link to={e.href} className="block rounded-lg border bg-card p-3 text-foreground hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={e.kind} tone={KIND_TONE[e.kind]} /><StatusBadge status={e.status} dot={false} /></div>
        <p className="mt-1.5 line-clamp-1 text-sm font-medium">{e.title}</p>
        <p className="text-xs text-muted-foreground">{e.subtitle}</p>
      </Link>
    </li>
  )
}
