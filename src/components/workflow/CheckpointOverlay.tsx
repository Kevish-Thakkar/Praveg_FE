import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowLeft, ArrowRight, CircleAlert, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/feedback/LoadingState"
import { ActivityTimeline, type TimelineEvent } from "@/components/common/ActivityTimeline"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { SUBSTEP_LABEL, statusText, type Checkpoint } from "@/lib/project-workflow"
import { CheckpointNode, SubStepIcon } from "./CheckpointNode"

export interface OverlayAction {
  key: string
  label: string
  icon?: LucideIcon
  onRun: () => void
  primary?: boolean
  destructive?: boolean
  pending?: boolean
  disabled?: boolean
  hint?: string
}

interface CheckpointOverlayProps {
  checkpoint: Checkpoint | null
  /** every checkpoint on the page, to resolve dependencies and step between checkpoints */
  all: Checkpoint[]
  trackLabel: string
  open: boolean
  onClose: () => void
  onNavigate: (id: string) => void
  activity: TimelineEvent[]
  actions: OverlayAction[]
}

const STATUS_CHIP: Record<Checkpoint["status"], string> = {
  completed: "bg-success-soft text-success",
  in_progress: "bg-primary-light text-primary-dark",
  blocked: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
  skipped: "bg-muted text-muted-foreground",
  not_started: "bg-muted text-muted-foreground",
}

/**
 * Everything about one checkpoint without leaving the project: status and owner, dates and dependencies,
 * the substeps, the step's activity, and only the actions that make sense right now.
 */
export function CheckpointOverlay({ checkpoint: c, all, trackLabel, open, onClose, onNavigate, activity, actions }: CheckpointOverlayProps) {
  const siblings = c ? all.filter((x) => x.track === c.track) : []
  const pos = c ? siblings.findIndex((x) => x.id === c.id) : -1
  const prev = pos > 0 ? siblings[pos - 1] : undefined
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : undefined
  const deps = c ? c.dependencies.map((id) => all.find((x) => x.id === id)).filter(Boolean) as Checkpoint[] : []

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 bg-card p-0 sm:max-w-xl">
        {c && (
          <>
            <SheetHeader className="gap-4 border-b px-6 pt-6 pb-5">
              <p className="text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">{trackLabel} · Step {pos + 1} of {siblings.length}</p>
              <div className="flex items-start gap-4 pr-6">
                <CheckpointNode status={c.status} progress={c.progress} number={pos + 1} size="lg" current />
                <div className="min-w-0 flex-1 space-y-2">
                  <SheetTitle className="text-xl leading-tight font-semibold">{c.title}</SheetTitle>
                  <SheetDescription asChild>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", STATUS_CHIP[c.status])}>{statusText(c)}</span>
                      <span className="text-muted-foreground">{c.statusNote}</span>
                    </div>
                  </SheetDescription>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span className="font-medium text-foreground tabular-nums">{c.progress}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`}>
                  <div className={cn("h-full rounded-full transition-all", c.status === "blocked" ? "bg-warning" : c.status === "failed" ? "bg-danger" : c.status === "completed" ? "bg-success" : "bg-primary-strong")} style={{ width: `${c.progress}%` }} />
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              {c.blockedReason && c.status !== "completed" && (
                <p className={cn("flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm", c.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")} role="status">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {c.blockedReason}
                </p>
              )}

              <section className="space-y-3" aria-labelledby="cp-summary">
                <h3 id="cp-summary" className="text-sm font-semibold text-foreground">Summary</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.description}</p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg bg-muted/60 p-4 text-sm">
                  <Item label="Owner" value={<>{c.owner}{c.ownerName && c.owner === "Coordinator" && <span className="block text-xs text-muted-foreground">{c.ownerName}</span>}</>} />
                  <Item label="Started" value={formatDate(c.startDate)} />
                  <Item label={c.dueDate?.label ?? "Due"} value={c.dueDate ? formatDate(c.dueDate.date) : "—"} />
                  <Item label="Completed" value={c.status === "completed" ? formatDate(c.completedAt) : "—"} />
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Depends on</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-2">
                      {deps.length ? deps.map((dep) => (
                        <button key={dep.id} type="button" onClick={() => onNavigate(dep.id)} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium hover:border-primary-strong/50 hover:text-primary-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                          <Link2 className="size-3" aria-hidden /> {dep.title} <span className="font-normal text-muted-foreground">· {statusText(dep)}</span>
                        </button>
                      )) : <span className="text-sm text-foreground">Nothing — this is where the work starts</span>}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="space-y-3" aria-labelledby="cp-steps">
                <h3 id="cp-steps" className="text-sm font-semibold text-foreground">Steps <span className="font-normal text-muted-foreground">· {c.substeps.filter((s) => s.status === "done" || s.status === "skipped").length} of {c.substeps.length}</span></h3>
                <ol className="space-y-1">
                  {c.substeps.map((s, i) => (
                    <li key={s.id} className={cn("relative flex gap-3 rounded-lg px-3 py-2.5", s.status === "current" && "bg-primary-light/70", s.status === "blocked" && "bg-warning-soft/60", s.status === "failed" && "bg-danger-soft/50")}>
                      {i < c.substeps.length - 1 && <span aria-hidden className="absolute top-8 bottom-[-6px] left-[21px] w-px bg-border" />}
                      <SubStepIcon status={s.status} className="relative mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", s.status === "pending" || s.status === "skipped" ? "text-muted-foreground" : "font-medium text-foreground", s.status === "skipped" && "line-through decoration-muted-foreground/40")}>
                          {s.label}<span className="sr-only"> — {SUBSTEP_LABEL[s.status]}</span>
                        </p>
                        {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                      </div>
                      {s.at && <time className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums" dateTime={s.at}>{formatDate(s.at, "dd MMM")}</time>}
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-3" aria-labelledby="cp-activity">
                <h3 id="cp-activity" className="text-sm font-semibold text-foreground">Activity</h3>
                <ActivityTimeline events={activity} empty="No activity for this step yet" />
              </section>
            </div>

            <footer className="space-y-3 border-t bg-card px-6 py-4">
              {actions.length ? (
                <div className="flex flex-wrap gap-2">
                  {actions.map((a) => (
                    <Button key={a.key} variant={a.primary ? "default" : a.destructive ? "outline" : "outline"} className={cn(a.destructive && "text-danger hover:text-danger")} disabled={a.disabled || a.pending} onClick={a.onRun} title={a.hint}>
                      {a.pending ? <Spinner /> : a.icon ? <a.icon /> : null} {a.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{c.status === "completed" ? "This step is complete." : "Nothing for you to do at this step right now."}</p>
              )}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" disabled={!prev} onClick={() => prev && onNavigate(prev.id)}><ArrowLeft /> {prev ? prev.title : "Previous"}</Button>
                <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onNavigate(next.id)}>{next ? next.title : "Next"} <ArrowRight /></Button>
              </div>
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  )
}
