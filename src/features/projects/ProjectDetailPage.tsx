import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import {
  Ban, BellRing, Lock, CalendarPlus, CheckCheck, CircleCheck, CircleX, FileUp, Mail, MailPlus, Pencil, Send, Trash2, UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DescriptionList } from "@/components/common/DescriptionList"
import { ActionMenu } from "@/components/common/ActionMenu"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Money } from "@/components/common/Money"
import { usePermission } from "@/components/common/Can"
import { MapPreview } from "@/components/forms/address"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { DocumentsPanel } from "@/features/documents/components/DocumentsPanel"
import { ActivityFeed } from "@/features/dashboard/components/ActivityFeed"
import { PresetComposer } from "@/features/emails/components/PresetComposer"
import { useTabParam } from "@/hooks/use-tab-param"
import { formatAddress } from "@/constants/geo"
import { formatDate, formatDateTime, relativeDay } from "@/lib/dates"
import type { ProjectRow } from "@/services"
import { JobHero } from "./components/workflow/JobHero"
import { StepCard, stepState } from "./components/workflow/StepCard"
import { PricingPanel } from "./components/workflow/PricingPanel"
import { CandidateList, RequestInspectorsDialog } from "./components/workflow/AvailabilityStep"
import { CancelDialog, DecisionDialog, ReportDialog, ScheduleDialog } from "./components/workflow/Dialogs"
import { EmailTimeline } from "./components/workflow/EmailTimeline"
import type { CandidateRow } from "./components/workflow/types"
import {
  useAssignInspector, useCandidates, useDeleteProject, useMarkJobDone, useProject, useRecordInterview, useRequestPricing, useSendCompletion, useSendCvs, useSendJobReminder,
} from "./hooks"

const TABS = ["workflow", "documents", "emails", "activity"] as const
type Dialog = "request" | "decision" | "schedule" | "report" | "cvs" | "completion" | "cancel" | "delete" | null

const ANCHOR: Record<string, string> = {
  replies: "step-2", price: "step-pricing", sendCvs: "step-3", interview: "step-4", assign: "step-4", reminder: "step-5", jobDone: "step-5",
  invoice: "step-billing", payment: "step-billing",
}
const OPENS: Record<string, Dialog> = { request: "request", decision: "decision", schedule: "schedule", report: "report", completion: "completion", sendCvs: "cvs" }

export function ProjectDetailPage() {
  const { projectId = "" } = useParams()
  const project = useProject(projectId)
  const candidates = useCandidates(projectId)
  if (project.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (project.isError) return <PageContainer><ErrorState message={project.error.message} onRetry={() => void project.refetch()} /></PageContainer>
  return <ProjectHub p={project.data} candidates={candidates.data ?? []} />
}

function ProjectHub({ p, candidates }: { p: ProjectRow; candidates: CandidateRow[] }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useTabParam(TABS, "workflow")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [pricingAuto, setPricingAuto] = useState(params.get("panel") === "pricing")
  const [cvSelection, setCvSelection] = useState<Set<string>>(new Set())
  const canEditRole = usePermission("projects", "edit")
  // coordinators cannot change a project once it is Completed
  const canEdit = canEditRole && !p.locked
  const canDelete = usePermission("projects", "delete")
  const canBill = usePermission("billing", "edit")
  const canPrice = usePermission("pricing", "edit")

  const assign = useAssignInspector()
  const interview = useRecordInterview()
  const reminder = useSendJobReminder()
  const jobDone = useMarkJobDone()
  const sendCvs = useSendCvs()
  const completion = useSendCompletion()
  const del = useDeleteProject()
  const requestPrice = useRequestPricing()

  const available = useMemo(() => candidates.filter((c) => c.availability === "Available"), [candidates])
  const unsentAvailable = available.filter((c) => !c.cvSentAt)
  useEffect(() => { setCvSelection(new Set(unsentAvailable.map((c) => c.id))) }, [candidates]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = candidates.find((c) => c.id === p.selection?.selectedCandidateId)
  const idx = p.insight.index
  const completed = p.stage === "Completed"
  const cancelled = p.stage === "Cancelled"
  const locked = cancelled || !canEdit

  const runAction = (key: string, fromLink = false) => {
    if ((key === "invoice" || key === "payment") && canBill) return navigate(`/finance?tab=${key === "invoice" ? "invoice" : "payments"}&project=${p.id}`)
    if (key === "price" && !canPrice && !fromLink) return requestPrice.mutate(p.id)
    if (key === "price") setPricingAuto(true)
    const open = OPENS[key]
    if (open && canEdit) return setDialog(open)
    setTab("workflow")
    const anchor = ANCHOR[key]
    if (anchor) {
      setHighlight(anchor)
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }))
      setTimeout(() => setHighlight(null), 1800)
    }
  }
  // deep link from the grid (?action=…)
  useEffect(() => {
    const a = params.get("action")
    if (!a) return
    runAction(a, true)
    setParams((prev) => { const n = new URLSearchParams(prev); n.delete("action"); n.delete("panel"); return n }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const st = (i: number) => (cancelled ? (i <= idx ? "done" : "upcoming") : stepState(i, idx, completed))

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Projects", to: "/projects" }, { label: p.code }]}
        backTo={{ to: "/projects", label: "projects" }}
        title={p.title}
        meta={<>
          <StatusBadge status={p.stage} />
          <span>{p.code}</span><span aria-hidden>·</span>
          <Link to={`/clients/${p.clientId}`} className="text-primary-text hover:underline">{p.clientName}</Link><span aria-hidden>·</span>
          <span>{p.serviceName}</span><span aria-hidden>·</span><span>{p.site.city}, {p.site.state}</span>
          {p.billing.status !== "Not Billable" && (canBill || canPrice) && <StatusBadge status={p.billing.status} />}
        </>}
        actions={<>
          {canEdit && !cancelled && <Button asChild variant="outline"><Link to={`/projects/${p.id}/edit`}><Pencil /> Edit</Link></Button>}
          <ActionMenu items={[
            { label: "Cancel project", icon: Ban, hidden: !canEdit || completed || cancelled, onSelect: () => setDialog("cancel") },
            { label: "Delete inquiry", icon: Trash2, destructive: true, hidden: !canDelete || p.stage !== "Inquiry", separatorBefore: true, onSelect: () => setDialog("delete") },
          ]} />
        </>}
      />

      {p.locked && p.stage === "Completed" && (
        <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft/50 px-3 py-2 text-sm text-success">
          <Lock className="size-4" aria-hidden /> This project is completed and read-only.
        </p>
      )}

      <JobHero
        p={p}
        onAction={runAction}
        cta={{
          show: canEdit || ["price", "invoice", "payment"].includes(p.insight.next.key) && (canPrice || canBill),
          label: p.insight.next.key === "price" && !canPrice ? (p.pricingRequestedAt ? "Remind Accounts" : "Request client price") : p.insight.next.label,
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="workflow" className="space-y-4">
            {/* 1 — Inquiry */}
            <StepCard id="step-1" number={1} title="Inquiry" state={st(0)}
              summary={<>Created {formatDate(p.createdAt)} · needed by {formatDate(p.requiredBy)} · {p.requiredSkills.join(", ") || "no specific skills"}</>}
              actions={!locked && ["Inquiry", "Inspector Assigned", "CVs Sent"].includes(p.stage) && <Button size="sm" variant={p.stage === "Inquiry" ? "default" : "outline"} onClick={() => setDialog("request")}><MailPlus /> {p.stage === "Inquiry" ? "Request availability" : "Request more inspectors"}</Button>}
            />

            {/* 2 — Inspector availability + client price */}
            <StepCard id="step-2" number={2} title="Inspector availability & confirmation" state={st(1)} highlight={highlight === "step-2" || highlight === "step-pricing"}
              summary={candidates.length ? `${available.length} of ${candidates.length} available · ${candidates.filter((c) => c.availability === "Requested").length} awaiting reply` : "Availability & confirmation emails go to the inspectors you select"}
            >
              <div className="space-y-4">
                <CandidateList candidates={candidates} canEdit={canEdit} locked={cancelled || idx >= 3} />
                <PricingPanel p={p} inspectors={available.map((c) => c.inspector)} autoOpen={pricingAuto} />
              </div>
            </StepCard>

            {/* 3 — CVs to client */}
            <StepCard id="step-3" number={3} title="CVs & price sent to client" state={st(2)} highlight={highlight === "step-3"}
              summary={candidates.some((c) => c.cvSentAt) ? `${candidates.filter((c) => c.cvSentAt).length} CV(s) sent ${formatDateTime(candidates.find((c) => c.cvSentAt)?.cvSentAt)}` : "Send the CVs of available inspectors together with the client price"}
              actions={!locked && idx <= 2 && idx >= 1 && (
                <Button size="sm" disabled={!p.pricing || !cvSelection.size} title={!p.pricing ? "Waiting for Accounts to set the client price" : undefined} onClick={() => setDialog("cvs")}><Send /> Send {cvSelection.size || ""} CV{cvSelection.size === 1 ? "" : "s"}</Button>
              )}
            >
              {idx >= 1 && idx <= 2 && unsentAvailable.length > 0 && !locked ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Select the CVs to include{!p.pricing && " — the client price must be set first"}.</p>
                  <ul className="divide-y rounded-xl border">{unsentAvailable.map((c) => (
                    <li key={c.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                      <Checkbox checked={cvSelection.has(c.id)} onCheckedChange={() => setCvSelection((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} />
                      <UserAvatar name={c.inspector.name} className="size-7" />
                      <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{c.inspector.name}</span><span className="block truncate text-xs text-muted-foreground">{c.hasCv ? "CV on file" : "No CV on file"} · {c.inspector.qualifications.join(", ")}</span></span>
                    </label></li>
                  ))}</ul>
                </div>
              ) : idx >= 2 ? (
                <div className="flex flex-wrap gap-2">{candidates.filter((c) => c.cvSentAt).map((c) => <Badge key={c.id} variant="secondary" className="border font-normal">{c.inspector.name}{c.outcome ? ` · ${c.outcome}` : ""}</Badge>)}</div>
              ) : null}
            </StepCard>

            {/* 4 — Client decision → inspector confirmed */}
            <StepCard id="step-4" number={4} title="Inspector confirmed" state={st(3)} highlight={highlight === "step-4"}
              summary={
                p.assignedInspectorName ? `${p.assignedInspectorName} assigned${p.selection?.mode === "Interview" ? " after interview" : " by direct selection"}`
                  : p.selection?.mode === "Interview" ? `Interview with ${chosen?.inspector.name} — ${formatDateTime(p.selection.interviewAt)}`
                    : p.selection ? `Client selected ${chosen?.inspector.name}` : "Client selects directly, or interviews first"
              }
              actions={!locked && (
                p.stage === "CVs Sent" ? <Button size="sm" onClick={() => setDialog("decision")}><UserCheck /> Record client decision</Button>
                  : p.stage === "Inspector Confirmed" && p.selection?.interviewResult === "Pending" ? <>
                    <Button size="sm" variant="outline" disabled={interview.isPending} onClick={() => interview.mutate({ projectId: p.id, result: "Failed" })}><CircleX /> Not selected</Button>
                    <Button size="sm" disabled={interview.isPending} onClick={() => interview.mutate({ projectId: p.id, result: "Passed" })}><CircleCheck /> Interview passed</Button>
                  </>
                    : p.stage === "Inspector Confirmed" && !p.assignedInspectorId ? <Button size="sm" disabled={assign.isPending} onClick={() => assign.mutate(p.id)}><UserCheck /> Assign {chosen?.inspector.name.split(" ")[0]} & send confirmation</Button>
                      : p.stage === "Inspector Confirmed" ? <Button size="sm" onClick={() => setDialog("schedule")}><CalendarPlus /> Schedule job</Button> : null
              )}
            >
              {p.selection && (
                <ol className="grid gap-2 text-sm sm:grid-cols-3">
                  {p.insight.index === 3 ? p.insight.substeps.map((s) => <SubStep key={s.label} label={s.label} done={s.done} />) : (
                    <><SubStep label={p.selection.mode === "Interview" ? "Interview passed" : "Direct selection"} done /><SubStep label="Inspector assigned" done={!!p.assignedInspectorId} /><SubStep label="Confirmation email" done={!!p.assignedInspectorId} /></>
                  )}
                </ol>
              )}
            </StepCard>

            {/* 5 — Job scheduled */}
            <StepCard id="step-5" number={5} title="Job scheduled" state={st(4)} highlight={highlight === "step-5"}
              summary={p.schedule ? `${p.schedule.dates.map((d) => formatDate(d, "dd MMM")).join(", ")} · ${relativeDay(p.schedule.dates[0]!)}` : "Pick the job date(s); a reminder goes to the inspector automatically 1 day before"}
              actions={!locked && p.stage === "Job Scheduled" && !p.completion.jobDoneAt && <>
                <Button size="sm" variant="outline" onClick={() => setDialog("schedule")}><CalendarPlus /> Change dates</Button>
                <Button size="sm" variant="outline" disabled={reminder.isPending} onClick={() => reminder.mutate(p.id)}><BellRing /> Send reminder now</Button>
                <Button size="sm" disabled={jobDone.isPending} onClick={() => jobDone.mutate(p.id)}><CheckCheck /> Mark job done</Button>
              </>}
            >
              {p.schedule && (
                <div className="space-y-3">
                  <ol className="grid gap-2 text-sm sm:grid-cols-3">
                    {(p.stage === "Job Scheduled" ? p.insight.substeps : [{ label: "Job date set", done: true }, { label: "Reminder (1 day before)", done: true }, { label: "Job done", done: !!p.completion.jobDoneAt }]).slice(0, 3).map((s) => <SubStep key={s.label} label={s.label} done={s.done} />)}
                  </ol>
                  {p.schedule.remindersSent.length > 0 && <p className="text-xs text-muted-foreground">Manual reminders sent: {p.schedule.remindersSent.map((r) => formatDateTime(r)).join(", ")}</p>}
                </div>
              )}
            </StepCard>

            {/* 6 — Completed */}
            <StepCard id="step-6" number={6} title="Report & completion" state={completed ? "done" : p.completion.jobDoneAt ? "current" : "upcoming"}
              summary={completed ? `Completion email sent ${formatDateTime(p.completion.completionEmailSentAt)}` : p.completion.reportUploadedAt ? "Report received — send the completion email with documents" : p.completion.jobDoneAt ? "Automatic report request goes to the inspector the morning after the job" : "After the job, upload the inspector's report and email it to the client"}
              actions={!locked && p.completion.jobDoneAt && !completed && <>
                <Button size="sm" variant={p.completion.reportUploadedAt ? "outline" : "default"} onClick={() => setDialog("report")}><FileUp /> {p.completion.reportUploadedAt ? "Add files" : "Upload report"}</Button>
                <Button size="sm" disabled={!p.completion.reportUploadedAt} onClick={() => setDialog("completion")}><Mail /> Send completion email</Button>
              </>}
            >
              {p.completion.jobDoneAt && (
                <ol className="grid gap-2 text-sm sm:grid-cols-3">
                  <SubStep label="Report requested (automatic)" done={!!p.completion.jobDoneAt} />
                  <SubStep label="Report uploaded" done={!!p.completion.reportUploadedAt} />
                  <SubStep label="Completion email → client" done={!!p.completion.completionEmailSentAt} />
                </ol>
              )}
            </StepCard>

            {completed && (canBill || canPrice) && (
              <Card id="step-billing" className={`scroll-mt-24 ${highlight === "step-billing" ? "ring-4 ring-warning/30" : ""}`}>
                <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 text-sm">
                    <p><StatusBadge status={p.billing.status} /></p>
                    {p.billing.invoice ? <p>{p.billing.invoice.number} · <Money amount={p.billing.invoice.total} currency={p.billing.invoice.currency} className="font-semibold" /> · due {formatDate(p.billing.invoice.dueDate)}</p> : <p className="text-muted-foreground">Accounts uploads the invoice after completion.</p>}
                    {p.billing.payment && <p className="text-success">Paid {formatDate(p.billing.payment.date)} via {p.billing.payment.method}</p>}
                  </div>
                  {canBill && <Button asChild size="sm" variant="outline"><Link to={`/finance?project=${p.id}`}>Open in Invoicing & Payments</Link></Button>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <DocumentsPanel readOnly={!canEdit && !canBill} entityType="Project" entityId={p.id} categories={["Technical Document", "Inspector Confirmation", "Report", "Out Document", "Purchase Order", "Other"]} title="Project documents" description="Technical documents, confirmations, reports and POs for this job." />
          </TabsContent>
          <TabsContent value="emails"><Card><CardContent className="pt-6"><EmailTimeline projectId={p.id} /></CardContent></Card></TabsContent>
          <TabsContent value="activity"><Card><CardContent><ActivityFeed projectId={p.id} limit={30} /></CardContent></Card></TabsContent>
        </Tabs>

        <aside className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Project details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <DescriptionList columns={1} items={[
                { label: "Client", value: <Link to={`/clients/${p.clientId}`} className="text-primary-text hover:underline">{p.clientName}</Link> },
                { label: "Vendor", value: p.vendorName ?? "—" },
                { label: "Service", value: `${p.serviceName} (${p.category})` },
                { label: "Required by", value: formatDate(p.requiredBy) },
                { label: "Coordinator", value: p.coordinatorName },
                { label: "Inspector", value: p.assignedInspectorId ? <Link to={`/inspectors/${p.assignedInspectorId}`} className="text-primary-text hover:underline">{p.assignedInspectorName}</Link> : "Not assigned" },
                { label: "Site", value: formatAddress(p.site) },
              ]} />
              {p.requiredSkills.length > 0 && <div className="flex flex-wrap gap-1">{p.requiredSkills.map((s) => <Badge key={s} variant="secondary" className="border bg-primary-soft font-normal text-primary-text">{s}</Badge>)}</div>}
              {p.description && <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{p.description}</p>}
              <MapPreview address={p.site} height="h-40" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Email timeline</CardTitle></CardHeader>
            <CardContent><EmailTimeline projectId={p.id} limit={6} /></CardContent>
          </Card>
        </aside>
      </div>

      <RequestInspectorsDialog p={p} open={dialog === "request"} onOpenChange={(o) => setDialog(o ? "request" : null)} />
      <DecisionDialog p={p} candidates={candidates} open={dialog === "decision"} onOpenChange={(o) => setDialog(o ? "decision" : null)} />
      <ScheduleDialog p={p} open={dialog === "schedule"} onOpenChange={(o) => setDialog(o ? "schedule" : null)} />
      <ReportDialog p={p} open={dialog === "report"} onOpenChange={(o) => setDialog(o ? "report" : null)} />
      <CancelDialog p={p} open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} />
      <PresetComposer
        open={dialog === "cvs"} onOpenChange={(o) => setDialog(o ? "cvs" : null)} projectId={p.id} kind="CVs to Client" candidateIds={[...cvSelection]}
        title="Send CVs & price to client" description="CVs of the selected inspectors are attached. The client's main email and contacts are pre-filled."
        sendLabel="Send to client" sending={sendCvs.isPending}
        onSend={(email) => sendCvs.mutate({ projectId: p.id, candidateIds: [...cvSelection], email }, { onSuccess: () => setDialog(null) })}
      />
      <PresetComposer
        open={dialog === "completion"} onOpenChange={(o) => setDialog(o ? "completion" : null)} projectId={p.id} kind="Completion"
        title="Send completion email" description="The report and documents are attached. Sending marks the project Completed and notifies Accounts."
        sendLabel="Send & complete" sending={completion.isPending}
        onSend={(email) => completion.mutate({ projectId: p.id, email }, { onSuccess: () => setDialog(null) })}
      />
      <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => setDialog(o ? "delete" : null)} title={`Delete ${p.code}?`} description="Only inquiries can be deleted. Later stages must be cancelled instead." confirmLabel="Delete inquiry" destructive loading={del.isPending} onConfirm={() => del.mutate(p.id, { onSuccess: () => navigate("/projects") })} />
    </PageContainer>
  )
}

function SubStep({ label, done }: { label: string; done: boolean }) {
  return (
    <li className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${done ? "border-success/30 bg-success-soft/50" : "bg-card"}`}>
      {done ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <span className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/40" aria-hidden />}
      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className="sr-only">{done ? "done" : "pending"}</span>
    </li>
  )
}
