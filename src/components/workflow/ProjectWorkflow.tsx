import { createContext, memo, useContext, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { currentIndex, statusText, type Checkpoint } from "@/lib/project-workflow"
import { CheckpointNode } from "./CheckpointNode"

type Orientation = "horizontal" | "vertical"
const Ctx = createContext<Orientation>("horizontal")

/**
 * Checkpoint workflow container.
 *   <ProjectWorkflow orientation="horizontal" label="Operations">
 *     <ProjectCheckpoint checkpoint={c} index={0} last={false} onOpen={…} />
 *   </ProjectWorkflow>
 * Horizontal needs room, so it switches to vertical below the md breakpoint automatically.
 */
export function ProjectWorkflow({ orientation = "horizontal", label, children, className }: { orientation?: Orientation; label: string; children: ReactNode; className?: string }) {
  return (
    <Ctx.Provider value={orientation}>
      <ol
        aria-label={label}
        className={cn(
          orientation === "horizontal" ? "flex flex-col md:grid md:auto-cols-fr md:grid-flow-col" : "flex flex-col",
          className,
        )}
      >
        {children}
      </ol>
    </Ctx.Provider>
  )
}

const TONE: Record<Checkpoint["status"], string> = {
  completed: "text-success",
  in_progress: "text-primary-strong",
  blocked: "text-warning",
  failed: "text-danger",
  skipped: "text-muted-foreground",
  not_started: "text-muted-foreground",
}

interface ProjectCheckpointProps {
  checkpoint: Checkpoint
  index: number
  last: boolean
  current?: boolean
  onOpen: (c: Checkpoint) => void
}

export const ProjectCheckpoint = memo(function ProjectCheckpoint({ checkpoint: c, index, last, current, onOpen }: ProjectCheckpointProps) {
  const orientation = useContext(Ctx)
  const done = c.status === "completed"
  const aria = `Step ${index + 1}: ${c.title} — ${statusText(c)}. ${c.statusNote}. Open details`

  if (orientation === "vertical") {
    return (
      <li className="relative flex gap-4" aria-current={current ? "step" : undefined}>
        {!last && <span aria-hidden className={cn("absolute top-12 bottom-0 left-6 w-0.5 -translate-x-1/2", done ? "bg-primary-dark" : "border-l-2 border-dashed border-input bg-transparent")} />}
        <button type="button" onClick={() => onOpen(c)} aria-label={aria} className="group flex w-full items-start gap-4 rounded-xl py-2 pr-2 text-left transition hover:bg-primary-light/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          <CheckpointNode status={c.status} progress={c.progress} number={index + 1} size="lg" current={current} />
          <span className={cn("min-w-0 flex-1 pt-1", !last && "pb-6")}>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[15px] font-semibold text-foreground">{c.title}</span>
              <span className={cn("text-xs font-medium", TONE[c.status])}>{statusText(c)}</span>
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{c.statusNote}</span>
            <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Owner: <span className="font-medium text-foreground">{c.owner}</span></span>
              {c.dueDate && c.status !== "completed" && <span>{c.dueDate.label}: <span className="font-medium text-foreground">{formatDate(c.dueDate.date)}</span></span>}
              {c.completedAt && c.status === "completed" && <span>Completed {formatDate(c.completedAt)}</span>}
            </span>
            {c.blockedReason && c.status !== "completed" && <span className={cn("mt-2 block rounded-md px-2.5 py-1.5 text-xs", c.status === "failed" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning")}>{c.blockedReason}</span>}
          </span>
          <ChevronRight className="mt-3 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary-strong" aria-hidden />
        </button>
      </li>
    )
  }

  return (
    <li className="relative md:px-1" aria-current={current ? "step" : undefined} title={`${c.title} — ${statusText(c)}. ${c.statusNote}`}>
      {/* connector to the next node (horizontal on md+, vertical below) */}
      {!last && <span aria-hidden className={cn("absolute top-[19px] left-[calc(50%+24px)] hidden h-0.5 w-[calc(100%-48px)] md:block", done ? "bg-primary-dark" : "border-t-2 border-dashed border-input")} />}
      {!last && <span aria-hidden className={cn("absolute top-10 bottom-0 left-[20px] w-0.5 md:hidden", done ? "bg-primary-dark" : "border-l-2 border-dashed border-input")} />}
      <button
        type="button"
        onClick={() => onOpen(c)}
        aria-label={aria}
        className="group flex w-full items-center gap-3 rounded-lg py-1 text-left transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex-col md:gap-1.5 md:py-0 md:text-center"
      >
        <CheckpointNode status={c.status} progress={c.progress} number={index + 1} size="md" current={current} className="transition group-hover:scale-105" />
        {/* name only — the node shows the state; the step that needs attention also shows its status */}
        <span className="min-w-0 pb-3 md:pb-0">
          <span className={cn("block truncate text-[13px] leading-tight font-medium group-hover:text-primary-strong", c.status === "not_started" || c.status === "skipped" ? "text-muted-foreground" : "text-foreground", current && "font-semibold")}>{c.title}</span>
          {current && c.status !== "completed" && <span className={cn("block text-[11px] font-medium", TONE[c.status])}>{statusText(c)}</span>}
        </span>
      </button>
    </li>
  )
})

/**
 * Compact checkpoint trail for listings: small nodes + the current step and its status.
 * Details live in the overlay — pass onOpen to make the trail a button that opens it.
 */
export const CheckpointTrail = memo(function CheckpointTrail({ list, className, onOpen }: { list: Checkpoint[]; className?: string; onOpen?: () => void }) {
  const cur = currentIndex(list)
  const shown = cur >= 0 ? list[cur]! : list[list.length - 1]!
  const allDone = cur < 0
  const label = allDone ? "All steps complete" : `Step ${cur + 1} of ${list.length}: ${shown.title} — ${statusText(shown)}`
  const body = (
    <>
      <span className="flex items-center" aria-hidden>
        {list.map((c, k) => (
          <span key={c.id} className={cn("flex items-center", k < list.length - 1 && "flex-1")}>
            <span title={`${c.title}: ${statusText(c)}`}><CheckpointNode status={c.status} progress={c.progress} number={k + 1} size="sm" /></span>
            {k < list.length - 1 && <span className={cn("mx-1 h-0.5 flex-1", c.status === "completed" ? "bg-primary-dark" : "border-t-2 border-dotted border-input")} />}
          </span>
        ))}
      </span>
      <span className="mt-2 flex flex-wrap items-baseline gap-x-2 text-xs leading-snug" aria-hidden>
        <span className="font-semibold text-foreground">{allDone ? "All steps complete" : shown.title}</span>
        {!allDone && <span className={cn("font-medium", TONE[shown.status])}>{statusText(shown)}</span>}
      </span>
    </>
  )
  if (!onOpen) return <div className={cn("w-56", className)} role="img" aria-label={label}>{body}</div>
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      onKeyDown={(e) => e.stopPropagation()}
      aria-label={`${label}. Open step details`}
      className={cn("-m-1.5 block w-56 rounded-lg p-1.5 text-left transition hover:bg-primary-light/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", className)}
    >
      {body}
    </button>
  )
})
