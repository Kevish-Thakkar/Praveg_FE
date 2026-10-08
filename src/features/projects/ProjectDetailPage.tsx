import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowRight, Ban, Lock, Pencil, Send, Trash2 } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { Breadcrumbs } from "@/components/navigation/Breadcrumbs"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DescriptionList } from "@/components/common/DescriptionList"
import { ActionMenu } from "@/components/common/ActionMenu"
import { Money } from "@/components/common/Money"
import { SectionHeader } from "@/components/common/SectionHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { ActivityTimeline, type TimelineEvent } from "@/components/common/ActivityTimeline"
import { usePermission } from "@/components/common/Can"
import { MapPreview } from "@/components/forms/address"
import { DetailSkeleton, TableSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { ProjectCheckpoint, ProjectWorkflow } from "@/components/workflow/ProjectWorkflow"
import { DocumentsPanel } from "@/features/documents/components/DocumentsPanel"
import { EmailList } from "@/features/emails/components/EmailList"
import { useEmails } from "@/features/emails/hooks"
import { MAILBOX_DATE_HEADER, MailboxTabs, inMailbox, useMailbox } from "@/features/emails/components/Mailbox"
import { VisitsTable } from "@/features/visits/components/VisitsTable"
import { useActivity } from "@/features/dashboard/hooks"
import { useTabParam } from "@/hooks/use-tab-param"
import { formatAddress } from "@/constants/geo"
import { TONE_CLASSES } from "@/constants/status"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { TRACK_LABEL, currentIndex, type Checkpoint } from "@/lib/project-workflow"
import { useRole } from "@/store/session.store"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "./components/workflow/types"
import { useCandidates, useProject } from "./hooks"
import { useProjectActions } from "./components/workspace/useProjectActions"
import { InspectorsPanel } from "./components/workspace/InspectorsPanel"
import { ProjectPOPanel } from "./components/workspace/ProjectPOPanel"
import { ProjectStepOverlay } from "./components/workspace/ProjectStepOverlay"
import { useProjectTracks } from "./components/workspace/useProjectTracks"

const TABS = ["overview", "inspectors", "visits", "po", "emails", "documents", "activity"] as const
type Tab = (typeof TABS)[number]

/** Old deep links (?action=price from the project board) → the checkpoint that owns that action. */
const ACTION_TO_CHECKPOINT: Record<string, string> = {
  request: "requirement", replies: "sourcing", price: "sourcing", sendCvs: "sourcing", decision: "onboarding", interview: "onboarding",
  assign: "onboarding", schedule: "execution", reminder: "execution", jobDone: "execution", report: "closure", completion: "closure",
  invoice: "invoicing", payment: "collection",
}

export function ProjectDetailPage() {
  const { projectId = "" } = useParams()
  const project = useProject(projectId)
  const candidates = useCandidates(projectId)
  if (project.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (project.isError) return <PageContainer><ErrorState message={project.error.message} onRetry={() => void project.refetch()} /></PageContainer>
  return <ProjectWorkspace p={project.data} candidates={candidates.data ?? []} />
}

/**
 * Project workspace — everything about one job.
 * Compact header (what, who, when) → tabs. The workflow checkpoints are on Overview;
 * the one in progress opens its step page; the others open an overlay with their details and actions.
 */
function ProjectWorkspace({ p, candidates }: { p: ProjectRow; candidates: CandidateRow[] }) {
  const role = useRole()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useTabParam(TABS, "overview")
  const { tracks, all, pos, visits, allPOs } = useProjectTracks(p, candidates)
  const emails = useEmails({ projectId: p.id })
  const [mailbox, setMailbox] = useMailbox()
  const activity = useActivity({ projectId: p.id, limit: 200 })
  const canSeeCandidates = usePermission("candidates")
  const canSeeVisits = usePermission("visits")
  const canSeePOs = usePermission("purchaseOrders")
  const canSeeEmails = usePermission("emails")
  const canEditCandidates = usePermission("candidates", "edit") && !p.locked
  const canBill = usePermission("billing", "view")
  const canUploadDocs = usePermission("projects", "edit") && !p.locked
  const canBillEdit = usePermission("billing", "edit")
  const [overlay, setOverlay] = useState<string | null>(null)
  const actions = useProjectActions({ p, candidates, pos, onGoTo: setTab })

  const events: TimelineEvent[] = useMemo(() => (activity.data ?? []).map((a) => ({ id: a.id, at: a.at, message: a.message, actorName: a.actorName })), [activity.data])

  // deep links: ?action=<key> from notifications / old links, ?step=<checkpoint>, ?panel=pricing
  useEffect(() => {
    const a = params.get("action")
    const step = params.get("step") ?? (params.get("panel") === "pricing" ? (role === "Accountant" ? "pricing" : "sourcing") : null)
    const target = step ?? (a ? (role === "Accountant" && a === "price" ? "pricing" : ACTION_TO_CHECKPOINT[a]) : null)
    if (target && all.some((c) => c.id === target)) setOverlay(target)
    if (a || step || params.get("panel")) setParams((prev) => { const n = new URLSearchParams(prev); n.delete("action"); n.delete("step"); n.delete("panel"); return n }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: "overview", label: "Overview", show: true },
    { id: "inspectors", label: "Inspectors", count: candidates.length, show: canSeeCandidates },
    { id: "visits", label: "Visits", count: visits.data?.length, show: canSeeVisits },
    { id: "po", label: "Purchase order", show: canSeePOs },
    { id: "emails", label: "Emails", count: emails.data?.length, show: canSeeEmails },
    { id: "documents", label: "Documents", show: true },
    { id: "activity", label: "Activity", show: true },
  ]
  const visibleTab = tabs.find((t) => t.id === tab && t.show) ? tab : "overview"
  const due = p.insight.due
  const openStep = (c: Checkpoint) => (c.status === "in_progress" ? navigate(`/projects/${p.id}/steps/${c.id}`) : setOverlay(c.id))

  return (
    <PageContainer className="space-y-5">
      {/* ── Header ── */}
      <header className="space-y-3">
        <Breadcrumbs items={[{ label: "Projects", to: "/projects" }, { label: p.code }]} />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-[22px]">{p.title}</h1>
              <StatusBadge status={p.stage} />
              {p.billing.status !== "Not Billable" && role !== "Coordinator" && <StatusBadge status={p.billing.status} />}
            </div>
            <p className="text-sm text-muted-foreground">
              {p.code}<span aria-hidden> · </span>
              <Link to={`/clients/${p.clientId}`} className="font-medium text-primary-text hover:underline">{p.clientName}</Link>
              <span aria-hidden> · </span>{p.serviceName}<span aria-hidden> · </span>{p.site.city}, {p.site.state}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions.resolve("editProject") && <Button asChild variant="outline" size="sm"><Link to={`/projects/${p.id}/edit`}><Pencil /> Edit</Link></Button>}
            <ActionMenu items={[
              { label: "Cancel project", icon: Ban, hidden: !actions.canCancel, onSelect: actions.openCancel },
              { label: "Delete inquiry", icon: Trash2, destructive: true, hidden: !actions.canDelete, separatorBefore: true, onSelect: actions.openDelete },
            ]} />
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg border bg-card px-4 py-2.5 text-sm">
          <Meta label="Owner" value={p.coordinatorName} />
          <Meta label="Inspector" value={p.assignedInspectorId ? <Link to={`/inspectors/${p.assignedInspectorId}`} className="text-primary-text hover:underline">{p.assignedInspectorName}</Link> : "Not assigned"} />
          <Meta label="Needed by" value={<>{formatDate(p.requiredBy)}{due && p.stage !== "Completed" && p.stage !== "Cancelled" && <span className={cn("ml-2 rounded px-1.5 py-0.5 text-xs font-semibold", TONE_CLASSES[due.tone])}>{due.text}</span>}</>} />
          {(canBill || role === "Super Admin") && p.pricing && <Meta label="Client price" value={<Money amount={p.priceTotal} currency={p.pricing.currency} />} />}
        </dl>
        {p.locked && p.stage === "Completed" && (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft px-4 py-2.5 text-sm text-success"><Lock className="size-4" aria-hidden /> This project is completed and read-only.</p>
        )}
        {p.stage === "Cancelled" && (
          <p className="flex items-center gap-2 rounded-lg bg-danger-soft px-4 py-2.5 text-sm text-danger"><Ban className="size-4" aria-hidden /> Cancelled{p.cancelledReason ? ` — ${p.cancelledReason}` : ""}</p>
        )}
      </header>

      {/* ── Project navigation ── */}
      <Tabs value={visibleTab} onValueChange={setTab} className="gap-5">
        {/* scrolls sideways only on narrow screens; no vertical scrollbar from the active underline */}
        <div className="-mx-4 overflow-x-auto overflow-y-hidden border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
          <TabsList variant="line" className="h-10 gap-6 p-0">
            {tabs.filter((t) => t.show).map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="h-10 flex-none px-0.5 text-sm after:!bottom-0">
                {t.label}{t.count ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-muted px-1.5 text-[11px] leading-none font-semibold text-muted-foreground tabular-nums">{t.count}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 space-y-5">
            {tracks.map((t) => (
              <Card key={t.id} className="gap-4 py-4">
                <CardHeader className="flex flex-row items-center justify-between gap-3 px-5">
                  <CardTitle>{tracks.length > 1 ? `${TRACK_LABEL[t.id]} workflow` : "Workflow"}</CardTitle>
                  <span className="text-xs text-muted-foreground">Select a step for details and actions</span>
                </CardHeader>
                <CardContent className="px-5">
                  <ProjectWorkflow orientation="horizontal" label={`${TRACK_LABEL[t.id]} workflow`}>
                    {t.list.map((c, i) => <ProjectCheckpoint key={c.id} checkpoint={c} index={i} last={i === t.list.length - 1} current={i === currentIndex(t.list)} onOpen={openStep} />)}
                  </ProjectWorkflow>
                </CardContent>
              </Card>
            ))}
            <Card className="gap-3 py-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3 px-5">
                <CardTitle>Recent activity</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setTab("activity")}>View all <ArrowRight /></Button>
              </CardHeader>
              <CardContent className="px-5">{activity.isPending ? <TableSkeleton rows={3} columns={1} /> : <ActivityTimeline events={events.slice(0, 5)} />}</CardContent>
            </Card>
          </div>
          <aside className="min-w-0 space-y-5">
            <Card className="gap-3 py-4">
              <CardHeader className="px-5"><CardTitle>Project details</CardTitle></CardHeader>
              <CardContent className="space-y-4 px-5">
                <DescriptionList columns={1} className="gap-y-3" items={[
                  { label: "Client", value: <><Link to={`/clients/${p.clientId}`} className="text-primary-text hover:underline">{p.clientName}</Link>{p.clientContactName && <span className="block text-xs text-muted-foreground">{p.clientContactName}</span>}</> },
                  { label: p.vendorNames.length > 1 ? "Vendors" : "Vendor", value: p.vendorNames.length ? p.vendorNames.join(", ") : "—" },
                  { label: "Service", value: p.serviceName === p.category ? p.serviceName : `${p.serviceName} (${p.category})` },
                  { label: "Site", value: formatAddress(p.site) },
                ]} />
                {p.requiredSkills.length > 0 && <div className="flex flex-wrap gap-1.5">{p.requiredSkills.map((s) => <Badge key={s} variant="secondary" className="border-primary-strong/20 bg-primary-light font-normal text-primary-dark">{s}</Badge>)}</div>}
                {p.description && <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>}
                <MapPreview address={p.site} height="h-36" />
              </CardContent>
            </Card>
            {role !== "Coordinator" && (canBill || role === "Super Admin") && (
              <Card className="gap-3 py-4">
                <CardHeader className="px-5"><CardTitle>Accounts</CardTitle></CardHeader>
                <CardContent className="px-5">
                  <DescriptionList columns={1} className="gap-y-3" items={[
                    { label: "Client price", value: p.pricing ? <Money amount={p.priceTotal} currency={p.pricing.currency} /> : "Not set" },
                    { label: "Purchase order", value: pos[0] ? (pos[0].poNumber || "Awaiting client PO") : "—" },
                    { label: "Invoice", value: p.billing.invoice ? <>{p.billing.invoice.number} · <Money amount={p.billing.invoice.total} currency={p.billing.invoice.currency} /><span className="block text-xs text-muted-foreground">Due {formatDate(p.billing.invoice.dueDate)}</span></> : "Not invoiced" },
                    { label: "Payment", value: p.billing.payment ? `Paid ${formatDate(p.billing.payment.date)} · ${p.billing.payment.method}` : p.billing.status === "Awaiting Payment" ? "Awaiting payment" : "—" },
                  ]} />
                </CardContent>
              </Card>
            )}
          </aside>
        </TabsContent>

        {canSeeCandidates && (
          <TabsContent value="inspectors">
            <InspectorsPanel p={p} candidates={candidates} canEdit={canEditCandidates} request={actions.resolve("requestAvailability")} sendCvs={actions.resolve("sendCvs")} selection={actions.cvSelection} onSelection={actions.setCvSelection} />
          </TabsContent>
        )}

        {canSeeVisits && (
          <TabsContent value="visits" className="space-y-4">
            <SectionHeader title="Visits" description="Job days are created when the job is scheduled. Add follow-up or repair visits here." actions={actions.resolve("scheduleVisit") && <Button size="sm" onClick={actions.resolve("scheduleVisit")!.run}>Schedule visit</Button>} />
            <Card className="gap-0 overflow-hidden py-0">
              {visits.isError ? <ErrorState message={visits.error.message} onRetry={() => void visits.refetch()} /> : <VisitsTable rows={visits.data ?? []} loading={visits.isPending} showProject={false} empty={<EmptyState compact title="No visits yet" description="Job days appear here once the job is scheduled." />} />}
            </Card>
          </TabsContent>
        )}

        {canSeePOs && (
          <TabsContent value="po" className="space-y-4">
            <SectionHeader title="Purchase order" description="The client's PO for this job, checked against the client price." />
            {allPOs.isPending ? <Card><TableSkeleton rows={2} columns={3} /></Card> : <ProjectPOPanel p={p} pos={pos} record={actions.resolve("recordPO")} />}
          </TabsContent>
        )}

        {canSeeEmails && (
          <TabsContent value="emails" className="space-y-4">
            <SectionHeader title="Emails" description="Replies received and every email sent for this project, including automatic reminders. Open an email to see the conversation and reply." actions={actions.resolve("sendDocuments") && <Button size="sm" variant="outline" onClick={actions.resolve("sendDocuments")!.run}><Send /> Send documents</Button>} />
            <Card className="gap-0 overflow-hidden py-0">
              <MailboxTabs value={mailbox} onChange={setMailbox} emails={emails.data ?? []} />
              {emails.isPending ? <TableSkeleton rows={4} columns={3} /> : emails.isError ? <ErrorState message={emails.error.message} onRetry={() => void emails.refetch()} /> : (
                <EmailList emails={(emails.data ?? []).filter((e) => inMailbox(e, mailbox))} showProject={false} dateHeader={MAILBOX_DATE_HEADER[mailbox]} empty={<EmptyState compact title={mailbox === "inbox" ? "No replies yet" : "No emails sent yet"} description={mailbox === "inbox" ? "Replies from inspectors and the client arrive here." : "Emails for this project are saved here automatically."} />} />
              )}
            </Card>
          </TabsContent>
        )}

        <TabsContent value="documents" className="space-y-4">
          <SectionHeader title="Documents" description="Technical documents, inspector confirmations, reports, out documents and the PO for this job." actions={actions.resolve("sendDocuments") && <Button size="sm" variant="outline" onClick={actions.resolve("sendDocuments")!.run}><Send /> Send to client</Button>} />
          <DocumentsPanel filterable grouped readOnly={!canUploadDocs && !canBillEdit} entityType="Project" entityId={p.id} categories={["Technical Document", "Inspector Confirmation", "Report", "Out Document", "Purchase Order", "Other"]} title="Project documents" description="Upload several files at once. Files can be attached when emailing the client." />
        </TabsContent>

        <TabsContent value="activity">
          <Card className="py-5"><CardContent className="px-5">{activity.isPending ? <TableSkeleton rows={4} columns={1} /> : <ActivityTimeline events={events} />}</CardContent></Card>
        </TabsContent>
      </Tabs>

      <ProjectStepOverlay p={p} candidates={candidates} stepId={overlay} onStep={setOverlay} onClose={() => setOverlay(null)} onGoTo={(t) => { setOverlay(null); setTab(t) }} />
      {actions.dialogs}
    </PageContainer>
  )
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  )
}
