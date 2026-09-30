import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { Check, FileText, MailQuestion, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { StageTrack } from "@/components/common/StageTrack"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { qk } from "@/lib/query"
import { formatDateTime } from "@/lib/dates"
import { projectService } from "@/services"
import { useRecordAvailability } from "@/features/projects/hooks"

type Row = Awaited<ReturnType<typeof projectService.allCandidates>>[number]

/** Every availability & confirmation request sent to inspectors, across projects. */
export function RequestsPage() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: [...qk.candidates, "all"], queryFn: projectService.allCandidates })
  const record = useRecordAvailability()
  const canEdit = usePermission("candidates", "edit")
  const [search, setSearch] = useState("")
  const [availability, setAvailability] = useState(ALL)
  const [cv, setCv] = useState(ALL)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? []).filter((r) =>
      (availability === ALL || r.availability === availability) &&
      (cv === ALL || (cv === "Sent" ? !!r.cvSentAt : !r.cvSentAt)) &&
      (!s || `${r.inspectorName} ${r.projectCode} ${r.projectTitle} ${r.clientName}`.toLowerCase().includes(s)))
  }, [q.data, search, availability, cv])
  const awaiting = (q.data ?? []).filter((r) => r.availability === "Requested").length

  const columns = useMemo<Column<Row>[]>(() => [
    { id: "ins", header: "Inspector", sortValue: (r) => r.inspectorName, cell: (r) => <div><p className="font-medium">{r.inspectorName}</p><p className="text-xs text-muted-foreground">{r.inspectorCity} · {r.distanceKm} km from site</p></div> },
    { id: "job", header: "Project", sortValue: (r) => r.projectCode, cell: (r) => <div className="min-w-0 max-w-[16rem]"><p className="truncate">{r.projectTitle}</p><p className="truncate text-xs text-muted-foreground">{r.projectCode} · {r.clientName}</p></div> },
    { id: "stage", header: "Stage", hideBelow: "xl", cell: (r) => <StageTrack stage={r.stage} /> },
    { id: "av", header: "Availability", sortValue: (r) => r.availability, cell: (r) => <div className="space-y-0.5"><StatusBadge status={r.availability} /><p className="text-[11px] text-muted-foreground">{r.respondedAt ? `Replied ${formatDateTime(r.respondedAt)}` : `Asked ${formatDateTime(r.requestedAt)}`}</p></div> },
    { id: "cv", header: "CV / outcome", hideBelow: "md", cell: (r) => <div className="flex flex-wrap gap-1">{r.cvSentAt ? <span className="inline-flex items-center gap-1 rounded bg-violet-soft px-1.5 py-0.5 text-[11px] font-medium text-violet"><FileText className="size-3" /> CV sent</span> : <span className="text-xs text-muted-foreground">—</span>}{r.outcome && <StatusBadge status={r.outcome} dot={false} />}</div> },
    { id: "a", header: "", align: "right", cell: (r) => canEdit && r.availability === "Requested" && (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="outline" disabled={record.isPending} onClick={() => record.mutate({ candidateId: r.id, availability: "Available" })}><Check /> Available</Button>
        <Button size="icon" variant="ghost" className="size-8" aria-label="Not available" disabled={record.isPending} onClick={() => record.mutate({ candidateId: r.id, availability: "Not Available" })}><X /></Button>
      </div>
    ) },
  ], [canEdit, record])

  return (
    <PageContainer>
      <PageHeader title="Inspector requests & CVs" description={`Availability & confirmation requests sent to inspectors. ${awaiting} awaiting a reply.`} />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={!!search || availability !== ALL || cv !== ALL} onReset={() => { setSearch(""); setAvailability(ALL); setCv(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Inspector, project or client" />
            <FilterSelect label="Availability" value={availability} onChange={setAvailability} options={["Requested", "Available", "Not Available"]} allLabel="Any reply" />
            <FilterSelect label="CV" value={cv} onChange={setCv} options={[{ value: "Sent", label: "CV sent" }, { value: "Not sent", label: "CV not sent" }]} allLabel="CV sent or not" />
          </FilterBar>
        </div>
        {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} getRowId={(r) => r.id} loading={q.isPending} onRowClick={(r) => navigate(`/projects/${r.projectId}`)} caption="Inspector requests"
            mobileCard={(r) => <div className="space-y-1"><div className="flex justify-between gap-2"><p className="font-medium">{r.inspectorName}</p><StatusBadge status={r.availability} /></div><p className="text-xs text-muted-foreground">{r.projectCode} · {r.clientName}</p></div>}
            empty={<EmptyState icon={MailQuestion} title="No requests" description="Request availability from a project page." />} />
        )}
      </Card>
    </PageContainer>
  )
}
