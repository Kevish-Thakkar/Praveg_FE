import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowRight, BriefcaseBusiness, CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { ListToolbar, type FilterDef } from "@/components/tables/ListToolbar"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { CheckpointTrail } from "@/components/workflow/ProjectWorkflow"
import { AmountDueCell, BillingNextAction } from "@/features/finance/components/BillingCells"
import { Can } from "@/components/common/Can"
import { usePOs } from "@/features/execution/hooks"
import { useHiddenColumns, useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { STAGES } from "@/lib/workflow"
import { financeTrack, operationsTrack } from "@/lib/project-workflow"
import { exportCsv } from "@/lib/csv"
import { cn } from "@/lib/utils"
import type { PORow, ProjectRow } from "@/services"
import { useRole } from "@/store/session.store"
import { useProjects } from "./hooks"
import { ProjectCheckpointSheet } from "./components/workspace/ProjectStepOverlay"
import { DueChip, NextAction } from "./components/ProjectCells"

const FILTER_KEYS = ["stage", "client", "service", "owner", "coordinator", "country"] as const
const VIEWS = [
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
] as const
const OWNERS = ["Coordinator", "Accounts", "Client", "Inspector"]

/** Project list: every row shows where the job is in its workflow, what it's waiting for and when it's due. */
export function ProjectsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data = [], isPending, isError, error, refetch } = useProjects()
  const pos = usePOs()
  const role = useRole()
  const accounts = role === "Accountant"
  const [search, setSearch] = useUrlSearch()
  const filters = useUrlFilters(FILTER_KEYS)
  const [hidden, setHidden] = useHiddenColumns(`projects-${role}`)
  const [sheet, setSheet] = useState<{ id: string; track: "operations" | "finance" } | null>(null)
  const v = filters.values
  // a stage filter pointing at a closed stage (dashboard link) implies the "all" view
  const rawView = params.get("view")
  const view = (VIEWS.some((x) => x.id === rawView) ? rawView : v.stage.some((s) => s === "Completed" || s === "Cancelled") ? "all" : "open") as (typeof VIEWS)[number]["id"]
  const setView = (id: string) => setParams((prev) => { const n = new URLSearchParams(prev); if (id === "open") n.delete("view"); else n.set("view", id); return n }, { replace: true })

  const posByProject = useMemo(() => {
    const m = new Map<string, PORow[]>()
    for (const po of pos.data ?? []) m.set(po.projectId, [...(m.get(po.projectId) ?? []), po])
    return m
  }, [pos.data])

  const inView = useMemo(() => data.filter((p) => {
    const closed = p.stage === "Completed" || p.stage === "Cancelled"
    return view === "all" || (view === "closed" ? closed : !closed)
  }), [data, view])

  const opts = (get: (p: ProjectRow) => [string, string]) => {
    const m = new Map<string, { label: string; count: number }>()
    for (const p of inView) { const [value, label] = get(p); const e = m.get(value); m.set(value, { label, count: (e?.count ?? 0) + 1 }) }
    return [...m.entries()].map(([value, e]) => ({ value, label: e.label, count: e.count })).sort((a, b) => a.label.localeCompare(b.label))
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const has = (list: string[], x: string) => !list.length || list.includes(x)
    return inView.filter((p) =>
      has(v.stage, p.stage) && has(v.client, p.clientId) && has(v.service, p.serviceId) && has(v.owner, accounts ? p.billingInsight.next.owner : p.insight.next.owner) &&
      has(v.coordinator, p.coordinatorId) && has(v.country, p.site.country) &&
      (!q || `${p.code} ${p.title} ${p.clientName} ${p.vendorName ?? ""} ${p.site.city} ${p.assignedInspectorName ?? ""}`.toLowerCase().includes(q)))
  }, [inView, v, search, accounts])

  const columns = useMemo<Column<ProjectRow>[]>(() => {
    const project: Column<ProjectRow> = {
      id: "project", header: "Project", sortValue: (p) => p.code, exportValue: (p) => `${p.code} — ${p.title}`,
      cell: (p) => (
        <div className="min-w-0 max-w-[15rem] 2xl:max-w-[22rem]">
          <p className="truncate font-medium text-foreground">{p.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.serviceName} · {p.site.city}</p>
        </div>
      ),
    }
    if (accounts) return [
      project,
      { id: "contact", header: "Client contact", hideBelow: "lg", sortValue: (p) => p.clientContactName ?? "~", cell: (p) => <div className="max-w-[11rem]"><p className="truncate text-sm">{p.clientContactName ?? "No contact"}</p>{p.clientContactEmail && <p className="truncate text-xs text-muted-foreground">{p.clientContactEmail}</p>}</div> },
      { id: "stage", header: "Accounts progress", sortValue: (p) => p.billingInsight.index, exportValue: (p) => p.billingInsight.label, cell: (p) => <CheckpointTrail list={financeTrack({ p, pos: posByProject.get(p.id) })} onOpen={() => setSheet({ id: p.id, track: "finance" })} /> },
      { id: "next", header: "Next action", hideBelow: "xl", sortValue: (p) => p.billingInsight.next.key, exportValue: (p) => p.billingInsight.next.label, cell: (p) => <BillingNextAction p={p} /> },
      { id: "due", header: "Amount & due", align: "right", sortValue: (p) => p.billingInsight.dueDate?.date ?? "9999", exportValue: (p) => p.priceTotal, cell: (p) => <AmountDueCell p={p} /> },
    ]
    return [
      project,
      { id: "stage", header: "Workflow", sortValue: (p) => (p.stage === "Cancelled" ? 99 : p.insight.index), exportValue: (p) => p.stage, cell: (p) => <CheckpointTrail list={operationsTrack({ p, pos: posByProject.get(p.id) })} onOpen={() => setSheet({ id: p.id, track: "operations" })} /> },
      { id: "next", header: "Next action", hideBelow: "lg", sortValue: (p) => p.insight.next.owner, exportValue: (p) => p.insight.next.label, cell: (p) => <NextAction p={p} /> },
      { id: "people", header: "Owner", hideBelow: "2xl", sortValue: (p) => p.coordinatorName, exportValue: (p) => p.coordinatorName, cell: (p) => <div className="max-w-[10rem] text-sm"><p className="truncate">{p.coordinatorName}</p><p className="truncate text-xs text-muted-foreground">{p.assignedInspectorName ?? "No inspector yet"}</p></div> },
      { id: "due", header: "Due", sortValue: (p) => p.insight.nextDate?.date ?? "9999", exportValue: (p) => p.insight.nextDate?.date ?? "", cell: (p) => <DueChip p={p} /> },
      ...(role === "Super Admin" ? [{ id: "billing", header: "Accounts", hideBelow: "xl" as const, sortValue: (p: ProjectRow) => p.billing.status, exportValue: (p: ProjectRow) => p.billing.status, cell: (p: ProjectRow) => <StatusBadge status={p.billing.status} /> }] : []),
    ]
  }, [accounts, role, posByProject])

  const stageOptions = [...STAGES.map((s) => s.stage), "Cancelled"]
    .filter((s) => inView.some((p) => p.stage === s))
    .map((s) => ({ value: s, label: s, count: inView.filter((p) => p.stage === s).length }))
  const filterDefs: FilterDef[] = [
    { id: "stage", label: "Stage", options: stageOptions, value: v.stage, onChange: (x) => filters.set("stage", x) },
    { id: "owner", label: "Waiting on", options: OWNERS.map((o) => ({ value: o, label: o })), value: v.owner, onChange: (x) => filters.set("owner", x) },
    { id: "client", label: "Client", options: opts((p) => [p.clientId, p.clientName]), value: v.client, onChange: (x) => filters.set("client", x) },
    { id: "service", label: "Service", options: opts((p) => [p.serviceId, p.serviceName]), value: v.service, onChange: (x) => filters.set("service", x) },
    ...(role !== "Coordinator" ? [{ id: "coordinator", label: "Coordinator", options: opts((p) => [p.coordinatorId, p.coordinatorName]), value: v.coordinator, onChange: (x: string[]) => filters.set("coordinator", x) }] : []),
    { id: "country", label: "Country", options: opts((p) => [p.site.country, p.site.country === "India" ? "India" : "UAE"]), value: v.country, onChange: (x) => filters.set("country", x) },
  ]
  const filtered = !!search || filters.activeCount > 0

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="One project is one job. Open a project to see its workflow, inspectors, visits, PO, emails and documents in one place."
        actions={<Can module="projects" action="create"><Button asChild><Link to="/projects/new"><Plus /> New inquiry</Link></Button></Can>}
      />

      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search code, name, client, city or inspector" }}
          filters={filterDefs}
          onClearFilters={filters.clear}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("projects", rows, columns)}
        >
          <div role="radiogroup" aria-label="Show projects" className="inline-flex h-10 rounded-md border border-input bg-card p-0.5">
            {VIEWS.map((x) => (
              <button key={x.id} type="button" role="radio" aria-checked={view === x.id} onClick={() => setView(x.id)}
                className={cn("rounded-[5px] px-3 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", view === x.id ? "bg-primary-dark text-white" : "text-muted-foreground hover:text-foreground")}>
                {x.label}
              </button>
            ))}
          </div>
        </ListToolbar>
        {isError ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : (
          <DataTable
            fill
            rows={rows}
            columns={columns}
            hiddenColumns={hidden}
            getRowId={(p) => p.id}
            loading={isPending}
            onRowClick={(p) => navigate(`/projects/${p.id}`)}
            initialSort={{ id: "due", dir: "asc" }}
            caption="Projects"
            mobileCard={(p) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</p>
                  </div>
                  {accounts ? <AmountDueCell p={p} /> : <DueChip p={p} />}
                </div>
                <CheckpointTrail list={accounts ? financeTrack({ p, pos: posByProject.get(p.id) }) : operationsTrack({ p, pos: posByProject.get(p.id) })} className="w-full" />
                {(accounts ? p.billingInsight.next.key : p.insight.next.key) !== "none" && (
                  <p className="inline-flex items-center gap-1 text-xs font-medium text-primary-text">Next: {accounts ? p.billingInsight.next.label : p.insight.next.label} <ArrowRight className="size-3" aria-hidden /></p>
                )}
              </div>
            )}
            empty={
              filtered || view !== "open" ? (
                <EmptyState icon={CalendarClock} title="No projects match" description="Try another view or clear the filters." action={<Button variant="outline" onClick={() => { filters.clear(); setSearch(""); setView("open") }}>Show open projects</Button>} />
              ) : (
                <EmptyState icon={BriefcaseBusiness} title="No projects yet" description="Create an inquiry to start finding inspectors." action={<Can module="projects" action="create"><Button asChild><Link to="/projects/new"><Plus /> New inquiry</Link></Button></Can>} />
              )
            }
          />
        )}
      </Card>
      {sheet && <ProjectCheckpointSheet key={sheet.id} projectId={sheet.id} track={sheet.track} onClose={() => setSheet(null)} />}
    </PageContainer>
  )
}
