import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { CircleAlert, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DescriptionList } from "@/components/common/DescriptionList"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { EmptyState } from "@/components/common/EmptyState"
import { Money } from "@/components/common/Money"
import { UserAvatar } from "@/components/common/UserAvatar"
import { StageTrack } from "@/components/common/StageTrack"
import { usePermission } from "@/components/common/Can"
import { MapPreview } from "@/components/forms/address"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { DocumentsPanel } from "@/features/documents/components/DocumentsPanel"
import { formatAddress } from "@/constants/geo"
import { formatDate } from "@/lib/dates"
import { useDeleteInspector, useInspector, useInspectorJobs } from "./hooks"

export function InspectorDetailPage() {
  const { inspectorId = "" } = useParams()
  const navigate = useNavigate()
  const q = useInspector(inspectorId)
  const jobs = useInspectorJobs(inspectorId)
  const del = useDeleteInspector()
  const canEdit = usePermission("inspectors", "edit")
  const canDelete = usePermission("inspectors", "delete")
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (q.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (q.isError) return <PageContainer><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></PageContainer>
  const i = q.data

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Inspectors", to: "/inspectors" }, { label: i.name }]}
        backTo={{ to: "/inspectors", label: "inspectors" }}
        title={<span className="flex items-center gap-3"><UserAvatar name={i.name} className="size-10" />{i.name}</span>}
        meta={<><StatusBadge status={i.status} /><span>{i.engagementType}</span><span aria-hidden>·</span><span>{i.nationality}</span><span aria-hidden>·</span><span>{i.address.city}, {i.address.state}</span></>}
        actions={<>
          {canEdit && <Button asChild variant="outline"><Link to={`/inspectors/${i.id}/edit`}><Pencil /> Edit</Link></Button>}
          <ActionMenu items={[{ label: "Delete inspector", icon: Trash2, destructive: true, hidden: !canDelete, onSelect: () => setConfirmDelete(true) }]} />
        </>}
      />
      {!i.hasCv && (
        <Alert className="border-warning/40 bg-warning-soft text-warning">
          <CircleAlert />
          <AlertDescription className="text-warning">No CV on file. CVs are sent to clients — edit the inspector to upload one.</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card>
          <CardHeader><CardTitle>Contact & location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DescriptionList columns={1} items={[{ label: "Email", value: i.email }, { label: "Phone", value: i.phone }, { label: "Address", value: formatAddress(i.address) }]} />
            <MapPreview address={i.address} height="h-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Skills & qualifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">{i.skills.map((d) => <Badge key={d} variant="secondary" className="border bg-primary-soft font-normal text-primary-text">{d}</Badge>)}</div>
            <ul className="list-disc space-y-1 pl-5 text-sm">{i.qualifications.map((x) => <li key={x}>{x}</li>)}</ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Inspector rates</CardTitle><CardDescription>Paid to the inspector, in {i.currency}</CardDescription></CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {([["Man-day rate", i.manDayRate], ["Lump sum rate", i.lumpSumRate], ["Hourly rate", i.hourlyRate], ["Round trip", i.roundTrip]] as const).map(([l, v]) => (
                <div key={l} className="flex items-center justify-between py-2"><dt className="text-muted-foreground">{l}</dt><dd><Money amount={v} currency={i.currency} className="font-medium" /></dd></div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>
      <DocumentsPanel entityType="Inspector" entityId={i.id} categories={["Certificate", "Other", "CV"]} title="CV, certificates & other documents" description="The CV is uploaded with the inspector form. Add certificates and supporting documents here. Restricted by default." />
      <Card className="gap-0 overflow-hidden pb-0">
        <CardHeader className="border-b pb-4"><CardTitle>Jobs</CardTitle><CardDescription>Projects where this inspector was requested or assigned</CardDescription></CardHeader>
        {jobs.isPending ? null : !jobs.data?.length ? <EmptyState compact title="No jobs yet" /> : (
          <ul className="divide-y">{jobs.data.map((a) => (
            <li key={a.candidateId}>
              <button type="button" onClick={() => navigate(`/projects/${a.projectId}`)} className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{a.code} · {a.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.assigned ? "Assigned" : `Availability: ${a.availability}`}{a.dates.length ? ` · ${a.dates.map((d) => formatDate(d)).join(", ")}` : ""}</span>
                </span>
                <StageTrack stage={a.stage} className="hidden sm:flex" />
              </button>
            </li>
          ))}</ul>
        )}
      </Card>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${i.name}?`} description="Inspectors already requested on projects cannot be deleted — set them to Inactive instead." confirmLabel="Delete" destructive loading={del.isPending} onConfirm={() => del.mutate(i.id, { onSuccess: () => navigate("/inspectors") })} />
    </PageContainer>
  )
}
