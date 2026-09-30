import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckpointOverlay } from "@/components/workflow/CheckpointOverlay"
import type { TimelineEvent } from "@/components/common/ActivityTimeline"
import { useActivity } from "@/features/dashboard/hooks"
import { TRACK_LABEL, currentIndex, type WorkflowTrack } from "@/lib/project-workflow"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "../workflow/types"
import { useCandidates, useProject } from "../../hooks"
import { useProjectActions } from "./useProjectActions"
import { useProjectTracks } from "./useProjectTracks"

/**
 * The checkpoint overlay plus every dialog its actions open. Used by the project page and by the
 * Projects / Invoicing lists (clicking a row's checkpoint trail), so both behave the same.
 */
export function ProjectStepOverlay({ p, candidates, stepId, onStep, onClose, onGoTo }: {
  p: ProjectRow
  candidates: CandidateRow[]
  stepId: string | null
  onStep: (id: string) => void
  onClose: () => void
  /** switch to a project tab (e.g. "Record replies" → Inspectors) */
  onGoTo: (tab: string) => void
}) {
  const { all, pos } = useProjectTracks(p, candidates)
  const actions = useProjectActions({ p, candidates, pos, onGoTo })
  const activity = useActivity({ projectId: p.id, limit: 200 })
  const open = all.find((c) => c.id === stepId) ?? null
  const events: TimelineEvent[] = useMemo(
    () => (open ? (activity.data ?? []).filter((a) => open.activity.test(a.message)).map((a) => ({ id: a.id, at: a.at, message: a.message, actorName: a.actorName })) : []),
    [open, activity.data],
  )
  return (
    <>
      <CheckpointOverlay
        checkpoint={open}
        all={all}
        trackLabel={open ? `${p.code} · ${TRACK_LABEL[open.track]}` : ""}
        open={!!open}
        onClose={onClose}
        onNavigate={(id) => all.some((c) => c.id === id) && onStep(id)}
        activity={events}
        actions={open ? actions.resolveAll(open.actions).map((a, i) => ({ key: a.key, label: a.label, icon: a.icon, onRun: a.run, primary: i === 0, pending: a.pending, disabled: a.disabled, hint: a.hint, destructive: a.key === "interviewFailed" })) : []}
      />
      {actions.dialogs}
    </>
  )
}

/** List pages: open a project's current checkpoint (of the given track) without leaving the list. */
export function ProjectCheckpointSheet({ projectId, track, onClose }: { projectId: string; track: WorkflowTrack; onClose: () => void }) {
  const project = useProject(projectId)
  const candidates = useCandidates(projectId)
  if (!project.data || candidates.isPending) return null
  return <SheetBody p={project.data} candidates={candidates.data ?? []} track={track} onClose={onClose} />
}

function SheetBody({ p, candidates, track, onClose }: { p: ProjectRow; candidates: CandidateRow[]; track: WorkflowTrack; onClose: () => void }) {
  const navigate = useNavigate()
  const { tracks } = useProjectTracks(p, candidates)
  const list = (tracks.find((t) => t.id === track) ?? tracks[0])!.list
  const i = currentIndex(list)
  const [stepId, setStepId] = useState<string>(list[i >= 0 ? i : list.length - 1]!.id)
  return <ProjectStepOverlay p={p} candidates={candidates} stepId={stepId} onStep={setStepId} onClose={onClose} onGoTo={(tab) => navigate(`/projects/${p.id}?tab=${tab}`)} />
}
