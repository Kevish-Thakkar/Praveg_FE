import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2, CircleAlert, HardHat, Plus } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar } from "@/components/tables/ListToolbar"
import { useHiddenColumns, useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { exportCsv } from "@/lib/csv"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Money } from "@/components/common/Money"
import { Can } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { COUNTRIES } from "@/constants/geo"
import { useSkills } from "@/features/settings/hooks"
import type { InspectorRow } from "@/services"
import { useInspectors } from "./hooks"

const KEYS = ["status", "skill", "country", "engagement"] as const

export function InspectorsPage() {
  const navigate = useNavigate()
  const { data = [], isPending, isError, error, refetch } = useInspectors()
  const [search, setSearch] = useUrlSearch()
  const skills = useSkills()
  const f = useUrlFilters(KEYS)
  const [hidden, setHidden] = useHiddenColumns("inspectors")
  const { skill, country, status, engagement } = f.values
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    const has = (l: string[], x: string) => !l.length || l.includes(x)
    return data.filter((i) =>
      (!skill.length || skill.some((k) => i.skills.includes(k))) && has(country, i.address.country) && has(status, i.status) && has(engagement, i.engagementType) &&
      (!s || `${i.name} ${i.email} ${i.address.city} ${i.address.state} ${i.nationality} ${i.skills.join(" ")} ${i.qualifications.join(" ")}`.toLowerCase().includes(s)))
  }, [data, search, skill, country, status, engagement])

  const columns = useMemo<Column<InspectorRow>[]>(() => [
    { id: "name", header: "Inspector", sortValue: (i) => i.name, exportValue: (i) => `${i.name} (${i.address.city})`, cell: (i) => <div><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.address.city}, {i.address.state}</p></div> },
    { id: "disc", header: "Skills & qualifications", hideBelow: "lg", exportValue: (i) => i.skills.join("; "), cell: (i) => <div className="max-w-[20rem] space-y-1"><div className="flex flex-wrap gap-1">{i.skills.map((d) => <Badge key={d} variant="secondary" className="border bg-primary-soft font-normal text-primary-text">{d}</Badge>)}</div><p className="line-clamp-1 text-xs text-muted-foreground">{i.qualifications.join(" · ")}</p></div> },
    { id: "rate", header: "Man-day rate", align: "right", sortValue: (i) => i.manDayRate, hideBelow: "sm", cell: (i) => <Money amount={i.manDayRate} currency={i.currency} /> },
    { id: "eng", header: "Engagement", hideBelow: "xl", exportValue: (i) => i.engagementType, cell: (i) => i.engagementType },
    { id: "jobs", header: "Active jobs", align: "right", hideBelow: "xl", sortValue: (i) => i.activeJobs, cell: (i) => <span className="tabular-nums">{i.activeJobs}</span> },
    { id: "cv", header: "CV", hideBelow: "md", exportValue: (i) => (i.hasCv ? "On file" : "Missing"), cell: (i) => (i.hasCv ? <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" /> On file</span> : <span className="inline-flex items-center gap-1 text-xs text-warning"><CircleAlert className="size-3.5" /> Missing</span>) },
    { id: "status", header: "Status", sortValue: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
  ], [])

  const filtered = !!search || f.activeCount > 0
  const count = (pred: (i: InspectorRow) => boolean) => data.filter(pred).length
  return (
    <PageContainer>
      <PageHeader title="Inspectors" description="Freelance, supplier-based and outsourced inspectors with location, skills, rates, CVs and certificates."
        actions={<Can module="inspectors" action="create"><Button asChild><Link to="/inspectors/new"><Plus /> Add inspector</Link></Button></Can>} />
      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search name, city, skill or qualification" }}
          filters={[
            { id: "status", label: "Status", options: ["Available", "On Assignment", "Inactive"].map((x) => ({ value: x, label: x, count: count((i) => i.status === x) })), value: status, onChange: (v) => f.set("status", v) },
            { id: "skill", label: "Skill", options: (skills.data ?? []).map((x) => ({ value: x, label: x, count: count((i) => i.skills.includes(x)) })), value: skill, onChange: (v) => f.set("skill", v) },
            { id: "country", label: "Country", options: COUNTRIES.map((x) => ({ value: x, label: x === "India" ? "India" : "UAE", count: count((i) => i.address.country === x) })), value: country, onChange: (v) => f.set("country", v) },
            { id: "engagement", label: "Engagement", options: ["Freelance", "Supplier-based", "Outsourced"].map((x) => ({ value: x, label: x, count: count((i) => i.engagementType === x) })), value: engagement, onChange: (v) => f.set("engagement", v) },
          ]}
          onClearFilters={f.clear}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("inspectors", rows, columns)}
        />
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} hiddenColumns={hidden} getRowId={(i) => i.id} loading={isPending} onRowClick={(i) => navigate(`/inspectors/${i.id}`)} initialSort={{ id: "name", dir: "asc" }} caption="Inspectors"
            mobileCard={(i) => <div className="space-y-1"><div className="flex justify-between gap-2"><p className="font-medium">{i.name}</p><StatusBadge status={i.status} /></div><p className="text-xs text-muted-foreground">{i.skills.join(", ")} · {i.address.city}</p><Money amount={i.manDayRate} currency={i.currency} className="text-xs" /></div>}
            empty={<EmptyState icon={HardHat} title={filtered ? "No inspectors match" : "No inspectors yet"} description={filtered ? "Widen the filters to see more inspectors." : "Build your inspector database with rates and CVs."} />}
          />
        )}
      </Card>
    </PageContainer>
  )
}
