import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2, CircleAlert, HardHat, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
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

export function InspectorsPage() {
  const navigate = useNavigate()
  const { data = [], isPending, isError, error, refetch } = useInspectors()
  const [search, setSearch] = useState("")
  const skills = useSkills()
  const [skill, setSkill] = useState(ALL)
  const [country, setCountry] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [engagement, setEngagement] = useState(ALL)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return data.filter((i) =>
      (skill === ALL || i.skills.includes(skill)) && (country === ALL || i.address.country === country) && (status === ALL || i.status === status) && (engagement === ALL || i.engagementType === engagement) &&
      (!s || `${i.name} ${i.email} ${i.address.city} ${i.address.state} ${i.nationality} ${i.skills.join(" ")} ${i.qualifications.join(" ")}`.toLowerCase().includes(s)))
  }, [data, search, skill, country, status, engagement])

  const columns = useMemo<Column<InspectorRow>[]>(() => [
    { id: "name", header: "Inspector", sortValue: (i) => i.name, cell: (i) => <div><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.address.city}, {i.address.state}</p></div> },
    { id: "disc", header: "Skills & qualifications", hideBelow: "lg", cell: (i) => <div className="max-w-[20rem] space-y-1"><div className="flex flex-wrap gap-1">{i.skills.map((d) => <Badge key={d} variant="secondary" className="border bg-primary-soft font-normal text-primary-text">{d}</Badge>)}</div><p className="line-clamp-1 text-xs text-muted-foreground">{i.qualifications.join(" · ")}</p></div> },
    { id: "rate", header: "Man-day rate", align: "right", sortValue: (i) => i.manDayRate, hideBelow: "sm", cell: (i) => <Money amount={i.manDayRate} currency={i.currency} /> },
    { id: "eng", header: "Engagement", hideBelow: "xl", cell: (i) => i.engagementType },
    { id: "jobs", header: "Active jobs", align: "right", hideBelow: "xl", sortValue: (i) => i.activeJobs, cell: (i) => <span className="tabular-nums">{i.activeJobs}</span> },
    { id: "cv", header: "CV", hideBelow: "md", cell: (i) => (i.hasCv ? <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" /> On file</span> : <span className="inline-flex items-center gap-1 text-xs text-warning"><CircleAlert className="size-3.5" /> Missing</span>) },
    { id: "status", header: "Status", sortValue: (i) => i.status, cell: (i) => <StatusBadge status={i.status} /> },
  ], [])

  const filtered = !!search || skill !== ALL || country !== ALL || status !== ALL || engagement !== ALL
  return (
    <PageContainer>
      <PageHeader title="Inspectors" description="Freelance, supplier-based and outsourced inspectors with location, skills, rates, CVs and certificates."
        actions={<Can module="inspectors" action="create"><Button asChild><Link to="/inspectors/new"><Plus /> Add inspector</Link></Button></Can>} />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={filtered} onReset={() => { setSearch(""); setSkill(ALL); setCountry(ALL); setStatus(ALL); setEngagement(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Name, city, skill, qualification" />
            <FilterSelect label="Skill" value={skill} onChange={setSkill} options={skills.data ?? []} allLabel="All skills" />
            <FilterSelect label="Country" value={country} onChange={setCountry} options={COUNTRIES} allLabel="All countries" />
            <FilterSelect label="Engagement" value={engagement} onChange={setEngagement} options={["Freelance", "Supplier-based", "Outsourced"]} allLabel="All engagement types" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={["Available", "On Assignment", "Inactive"]} allLabel="Any status" />
          </FilterBar>
        </div>
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable rows={rows} columns={columns} getRowId={(i) => i.id} loading={isPending} onRowClick={(i) => navigate(`/inspectors/${i.id}`)} initialSort={{ id: "name", dir: "asc" }} caption="Inspectors"
            mobileCard={(i) => <div className="space-y-1"><div className="flex justify-between gap-2"><p className="font-medium">{i.name}</p><StatusBadge status={i.status} /></div><p className="text-xs text-muted-foreground">{i.skills.join(", ")} · {i.address.city}</p><Money amount={i.manDayRate} currency={i.currency} className="text-xs" /></div>}
            empty={<EmptyState icon={HardHat} title={filtered ? "No inspectors match" : "No inspectors yet"} description={filtered ? "Widen the filters to see more inspectors." : "Build your inspector database with rates and CVs."} />}
          />
        )}
      </Card>
    </PageContainer>
  )
}
