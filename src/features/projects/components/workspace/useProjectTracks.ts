import { useMemo } from "react"
import { usePOs, useVisits } from "@/features/execution/hooks"
import { financeTrack, operationsTrack, tracksFor, type Checkpoint, type WorkflowTrack } from "@/lib/project-workflow"
import { useRole } from "@/store/session.store"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "../workflow/types"

/** Checkpoint tracks for a project, for the current role (Super Admin gets both). */
export function useProjectTracks(p: ProjectRow, candidates: CandidateRow[]) {
  const role = useRole()
  const allPOs = usePOs()
  const visits = useVisits(p.id)
  const pos = useMemo(() => (allPOs.data ?? []).filter((x) => x.projectId === p.id), [allPOs.data, p.id])
  const trackIds = tracksFor(role)
  const tracks = useMemo(() => {
    const input = { p, candidates, pos, visits: visits.data ?? [] }
    return trackIds.map((id) => ({ id, list: id === "operations" ? operationsTrack(input) : financeTrack(input) })) as { id: WorkflowTrack; list: Checkpoint[] }[]
  }, [p, candidates, pos, visits.data, trackIds])
  return { tracks, all: tracks.flatMap((t) => t.list), pos, visits, allPOs }
}

