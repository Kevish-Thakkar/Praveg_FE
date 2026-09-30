import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar, type FilterDef } from "@/components/tables/ListToolbar"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { useVisits } from "@/features/execution/hooks"
import { VisitsTable } from "./components/VisitsTable"

const VIEWS = ["Upcoming", "Completed", "Cancelled", "All"] as const
const KEYS = ["type", "inspector"] as const
const VIEW_KEY = ["view"] as const

/** Job days (from the schedule) plus follow-up and repair visits */
export function VisitsPage() {
  const { data = [], isPending, isError, error, refetch } = useVisits()
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const tab = useUrlFilters(VIEW_KEY)
  const view = tab.values.view[0] ?? "Upcoming"
  const inView = useMemo(() => data.filter((v) => view === "All" || v.status === view), [data, view])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const has = (list: string[], x: string) => !list.length || list.includes(x)
    return inView.filter((v) => has(f.values.type, v.type) && has(f.values.inspector, v.inspectorName) &&
      (!q || `${v.projectCode} ${v.projectTitle} ${v.inspectorName} ${v.location} ${v.clientName} ${v.notes}`.toLowerCase().includes(q)))
  }, [inView, f.values, search])

  const inspectors = [...new Set(inView.map((v) => v.inspectorName))].sort()
  const filters: FilterDef[] = [
    { id: "type", label: "Visit type", options: ["Inspection", "Follow-up", "Repair"].map((t) => ({ value: t, label: t, count: inView.filter((v) => v.type === t).length })), value: f.values.type, onChange: (x) => f.set("type", x) },
    { id: "inspector", label: "Inspector", options: inspectors.map((n) => ({ value: n, label: n, count: inView.filter((v) => v.inspectorName === n).length })), value: f.values.inspector, onChange: (x) => f.set("inspector", x) },
  ]

  return (
    <PageContainer>
      <PageHeader title="Visits" description="Job days created when a job is scheduled, plus any follow-up and repair visits." />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b px-4 pt-4 sm:px-5">
          <Tabs value={view} onValueChange={(v) => tab.set("view", v === "Upcoming" ? [] : [v])}>
            <TabsList>{VIEWS.map((v) => <TabsTrigger key={v} value={v}>{v} <span className="text-muted-foreground tabular-nums">{data.filter((x) => v === "All" || x.status === v).length}</span></TabsTrigger>)}</TabsList>
          </Tabs>
        </div>
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Project, client, inspector, notes" }} filters={filters} onClearFilters={f.clear} />
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : <VisitsTable fill rows={rows} loading={isPending} />}
      </Card>
    </PageContainer>
  )
}
