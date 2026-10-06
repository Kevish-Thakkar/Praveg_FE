import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import type { AppIcon } from "@/components/icons"
import { ArrowLeft, ArrowRight, CircleAlert, Link2, Maximize2 } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/feedback/LoadingState"
import { ActivityTimeline, type TimelineEvent } from "@/components/common/ActivityTimeline"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { SUBSTEP_LABEL, statusText, type Checkpoint, type SubStep } from "@/lib/project-workflow"
import { CheckpointNode, SubStepIcon } from "./CheckpointNode"

export interface OverlayAction {
  key: string
  label: string
  icon?: AppIcon
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
  actions: OverlayAction[]
  /** extra controls next to the actions, e.g. the visits popover on the job step */
  extra?: ReactNode
  /** full details page for the open checkpoint */
  detailsHref?: string
}

export const STATUS_CHIP: Record<Checkpoint["status"], string> = {
  completed: "bg-success-soft text-success",
  in_progress: "bg-primary-light text-primary-dark",
  blocked: "bg-warning-soft text-warning",
  failed: "bg-danger-soft text-danger",
  skipped: "bg-muted text-muted-foreground",
  not_started: "bg-muted text-muted-foreground",
}

/** Position of a checkpoint within its track, with its neighbours. */
export function checkpointPosition(c: Checkpoint | null, all: Checkpoint[]) {
  const siblings = c ? all.filter((x) => x.track === c.track) : []
  const pos = c ? siblings.findIndex((x) => x.id === c.id) : -1
  return {
    siblings,
    pos,
    prev: pos > 0 ? siblings[pos - 1] : undefined,
    next: pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : undefined,
  }
}

/** The substep that needs attention now: current / blocked / failed first, otherwise the next pending one. */
function focusSubStep(c: Checkpoint): SubStep | undefined {
  return c.substeps.find((s) => s.status === "current" || s.status === "blocked" || s.status === "failed") ?? c.substeps.find((s) => s.status === "pending")
}

const doneCount = (c: Checkpoint) => c.substeps.filter((s) => s.status === "done" || s.status === "skipped").length

/**
 * Quick look at one checkpoint without leaving the page: status, progress, what needs doing now and the
 * actions that make sense right now. Everything else lives on the checkpoint's details page.
 */
export function CheckpointOverlay({ checkpoint: c, all, trackLabel, open, onClose, onNavigate, actions, detailsHref, extra }: CheckpointOverlayProps) {
  const { siblings, pos, prev, next } = checkpointPosition(c, all)
  const focus = c ? focusSubStep(c) : undefined

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
              <CheckpointProgress c={c} />
            </SheetHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <CheckpointBlocked c={c} />

              <section className="space-y-3" aria-labelledby="cp-now">
                <h3 id="cp-now" className="text-sm font-semibold text-foreground">Current step <span className="font-normal text-muted-foreground">· {doneCount(c)} of {c.substeps.length} done</span></h3>
                {focus ? (
                  <div className={cn("flex gap-3 rounded-lg px-3 py-2.5", focus.status === "current" && "bg-primary-light/70", focus.status === "blocked" && "bg-warning-soft/60", focus.status === "failed" && "bg-danger-soft/50", focus.status === "pending" && "bg-muted/60")}>
                    <SubStepIcon status={focus.status} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{focus.label}<span className="sr-only"> — {SUBSTEP_LABEL[focus.status]}</span></p>
                      {focus.note && <p className="text-xs text-muted-foreground">{focus.note}</p>}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{c.substeps.length ? "All steps are done." : "No steps for this checkpoint."}</p>
                )}
              </section>

              {detailsHref && (
                <Button asChild variant="outline" className="w-full">
                  <Link to={detailsHref}><Maximize2 /> View full details</Link>
                </Button>
              )}
            </div>

            <footer className="space-y-3 border-t bg-card px-6 py-4">
              <CheckpointActions c={c} actions={actions} extra={extra} />
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

export function CheckpointProgress({ c }: { c: Checkpoint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span className="font-medium text-foreground tabular-nums">{c.progress}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.title} progress`}>
        <div className={cn("h-full rounded-full transition-all", c.status === "blocked" ? "bg-warning" : c.status === "failed" ? "bg-danger" : c.status === "completed" ? "bg-success" : "bg-primary-strong")} style={{ width: `${c.progress}%` }} />
      </div>
    </div>
  )
}

export function CheckpointBlocked({ c }: { c: Checkpoint }) {
  if (!c.blockedReason || c.status === "completed") return null
  return (
    <p className={cn("flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm", c.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")} role="status">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {c.blockedReason}
    </p>
  )
}

export function CheckpointSummary({ c, all, onNavigate }: { c: Checkpoint; all: Checkpoint[]; onNavigate: (id: string) => void }) {
  const deps = c.dependencies.map((id) => all.find((x) => x.id === id)).filter(Boolean) as Checkpoint[]
  return (
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
  )
}

export function CheckpointSteps({ c }: { c: Checkpoint }) {
  return (
    <section className="space-y-3" aria-labelledby="cp-steps">
      <h3 id="cp-steps" className="text-sm font-semibold text-foreground">Steps <span className="font-normal text-muted-foreground">· {doneCount(c)} of {c.substeps.length}</span></h3>
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
  )
}

export function CheckpointActivity({ activity }: { activity: TimelineEvent[] }) {
  return (
    <section className="space-y-3" aria-labelledby="cp-activity">
      <h3 id="cp-activity" className="text-sm font-semibold text-foreground">Activity</h3>
      <ActivityTimeline events={activity} empty="No activity for this step yet" />
    </section>
  )
}

export function CheckpointActions({ c, actions, extra }: { c: Checkpoint; actions: OverlayAction[]; extra?: ReactNode }) {
  if (!actions.length && !extra) return <p className="text-sm text-muted-foreground">{c.status === "completed" ? "This step is complete." : "Nothing for you to do at this step right now."}</p>
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Button key={a.key} variant={a.primary ? "default" : "outline"} className={cn(a.destructive && "text-danger hover:text-danger")} disabled={a.disabled || a.pending} onClick={a.onRun} title={a.hint}>
          {a.pending ? <Spinner /> : a.icon ? <a.icon /> : null} {a.label}
        </Button>
      ))}
      {extra}
    </div>
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
