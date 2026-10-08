import { useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs"
import { EmptyState } from "@/components/common/EmptyState"
import type { TimelineEvent } from "@/components/common/ActivityTimeline"
import { DetailSkeleton, TableSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { CheckpointNode } from "@/components/workflow/CheckpointNode"
import { CheckpointJumper } from "@/components/workflow/ProjectWorkflow"
import {
  CheckpointActions, CheckpointActivity, CheckpointBlocked, CheckpointProgress, CheckpointSteps, CheckpointSummary, STATUS_CHIP, checkpointPosition,
} from "@/components/workflow/CheckpointOverlay"
import { useActivity } from "@/features/dashboard/hooks"
import { TRACK_LABEL, statusText } from "@/lib/project-workflow"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "./components/workflow/types"
import { useCandidates, useProject } from "./hooks"
import { useProjectActions } from "./components/workspace/useProjectActions"
import { useProjectTracks } from "./components/workspace/useProjectTracks"
import { toOverlayActions } from "./components/workspace/ProjectStepOverlay"
import { VISIT_STEPS } from "./components/workspace/visit-steps"
import { VisitsPopover } from "@/features/visits/components/VisitsPopover"

/** Full details of one workflow checkpoint, opened from the checkpoint overlay. */
export function ProjectStepPage() {
  const { projectId = "" } = useParams()
  const project = useProject(projectId)
  const candidates = useCandidates(projectId)
  if (project.isPending || candidates.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (project.isError) return <PageContainer><ErrorState message={project.error.message} onRetry={() => void project.refetch()} /></PageContainer>
  return <StepDetails p={project.data} candidates={candidates.data ?? []} />
}

function StepDetails({ p, candidates }: { p: ProjectRow; candidates: CandidateRow[] }) {
  const { stepId = "" } = useParams()
  const navigate = useNavigate()
  const { all, pos: purchaseOrders } = useProjectTracks(p, candidates)
  const actions = useProjectActions({ p, candidates, pos: purchaseOrders, onGoTo: (tab) => navigate(`/projects/${p.id}?tab=${tab}`) })
  const activity = useActivity({ projectId: p.id, limit: 200 })
  const c = all.find((x) => x.id === stepId) ?? null
  const { siblings, pos, prev, next } = checkpointPosition(c, all)
  const events: TimelineEvent[] = useMemo(
    () => (c ? (activity.data ?? []).filter((a) => c.activity.test(a.message)).map((a) => ({ id: a.id, at: a.at, message: a.message, actorName: a.actorName })) : []),
    [c, activity.data],
  )
  const withVisits = !!c && VISIT_STEPS.has(c.id) && !!p.assignedInspectorId
  const scheduleVisit = actions.resolve("scheduleVisit")
  const goTo = (id: string) => navigate(`/projects/${p.id}/steps/${id}`, { replace: true })

  if (!c) {
    return (
      <PageContainer className="space-y-5">
        <Breadcrumbs items={[{ label: "Projects", to: "/projects" }, { label: p.code, to: `/projects/${p.id}` }, { label: "Step" }]} />
        <Card><EmptyState title="Step not found" description="This workflow step does not exist for this project." action={<Button asChild variant="outline"><Link to={`/projects/${p.id}`}>Back to project</Link></Button>} /></Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-5">
      <header className="space-y-3">
        <Breadcrumbs items={[{ label: "Projects", to: "/projects" }, { label: p.code, to: `/projects/${p.id}` }, { label: c.title }]} />
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 px-6 py-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <p className="text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">{p.code} · {TRACK_LABEL[c.track]} · Step {pos + 1} of {siblings.length}</p>
              <CheckpointJumper list={siblings} activeId={c.id} onSelect={(s) => goTo(s.id)} />
            </div>
            <div className="flex items-start gap-4">
              <CheckpointNode status={c.status} progress={c.progress} number={pos + 1} size="lg" current />
              <div className="min-w-0 flex-1 space-y-2">
                <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-[22px]">{c.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", STATUS_CHIP[c.status])}>{statusText(c)}</span>
                  <span className="text-muted-foreground">{c.statusNote}</span>
                </div>
              </div>
            </div>
            <CheckpointProgress c={c} />
            <CheckpointBlocked c={c} />
            <div className="border-t pt-4"><CheckpointActions c={c} actions={toOverlayActions(actions, c).filter((a) => !withVisits || a.key !== "scheduleVisit")} extra={withVisits ? <VisitsPopover p={p} onSchedule={scheduleVisit?.run} /> : undefined} /></div>
          </CardContent>
        </Card>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="py-5">
          <CardContent className="space-y-7 px-6">
            <CheckpointSummary c={c} all={all} onNavigate={goTo} />
            <CheckpointSteps c={c} />
          </CardContent>
        </Card>
        <Card className="py-5">
          <CardContent className="px-6">{activity.isPending ? <TableSkeleton rows={3} columns={1} /> : <CheckpointActivity activity={events} />}</CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={!prev} onClick={() => prev && goTo(prev.id)}><ArrowLeft /> {prev ? prev.title : "Previous"}</Button>
        <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && goTo(next.id)}>{next ? next.title : "Next"} <ArrowRight /></Button>
      </div>
      {actions.dialogs}
    </PageContainer>
  )
}
