import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useVisits } from "@/features/execution/hooks"
import { VisitsTable } from "./components/VisitsTable"

const VIEWS = ["Upcoming", "Completed", "Cancelled", "All"] as const

/** Job days (from the schedule) plus follow-up and repair visits */
export function VisitsPage() {
  const { data = [], isPending, isError, error, refetch } = useVisits()
  const [view, setView] = useState<string>("Upcoming")
  const [type, setType] = useState(ALL)
  const [search, setSearch] = useState("")
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((v) => (view === "All" || v.status === view) && (type === ALL || v.type === type) && (!q || `${v.projectCode} ${v.projectTitle} ${v.inspectorName} ${v.location} ${v.clientName}`.toLowerCase().includes(q)))
  }, [data, view, type, search])

  return (
    <PageContainer>
      <PageHeader title="Visits" description="Job days created when a job is scheduled, plus any follow-up and repair visits." />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>{VIEWS.map((v) => <TabsTrigger key={v} value={v}>{v} <span className="text-muted-foreground tabular-nums">{data.filter((x) => v === "All" || x.status === v).length}</span></TabsTrigger>)}</TabsList>
          </Tabs>
          <FilterBar>
            <SearchInput value={search} onChange={setSearch} placeholder="Project, client, inspector" />
            <FilterSelect label="Type" value={type} onChange={setType} options={["Inspection", "Follow-up", "Repair"]} allLabel="All visit types" />
          </FilterBar>
        </div>
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : <VisitsTable rows={rows} loading={isPending} />}
      </Card>
    </PageContainer>
  )
}
