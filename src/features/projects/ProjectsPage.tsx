import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowRight, BriefcaseBusiness, CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { BillingProgress, StageProgress } from "@/components/common/StageProgress"
import { AmountDueCell, BillingNextAction } from "@/features/finance/components/BillingCells"
import { Can } from "@/components/common/Can"
import { STAGES } from "@/lib/workflow"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"
import { useProjects } from "./hooks"
import { DueChip, NextAction } from "./components/ProjectCells"
import { useRole } from "@/store/session.store"

const OPEN = "__open__"
const OWNERS = ["Coordinator", "Accounts", "Client", "Inspector"] as const

/** Project board: every row shows stage progress, the current checkpoint, the next action and its due date. */
export function ProjectsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data = [], isPending, isError, error, refetch } = useProjects()
  const [search, setSearch] = useState("")
  const [client, setClient] = useState(ALL)
  const [service, setService] = useState(ALL)
  const [owner, setOwner] = useState(ALL)
  const stage = params.get("stage") ?? OPEN
  const setStage = (s: string) => setParams((p) => { const n = new URLSearchParams(p); if (s === OPEN) n.delete("stage"); else n.set("stage", s); return n }, { replace: true })

  const clientOptions = useMemo(() => [...new Map(data.map((p) => [p.clientId, p.clientName])).entries()].map(([value, label]) => ({ value, label })), [data])
  const serviceOptions = useMemo(() => [...new Map(data.map((p) => [p.serviceId, p.serviceName])).entries()].map(([value, label]) => ({ value, label })), [data])

  const counts = useMemo(() => {
    const c: Record<string, number> = { [OPEN]: 0 }
    for (const p of data) {
      c[p.stage] = (c[p.stage] ?? 0) + 1
      if (p.stage !== "Completed" && p.stage !== "Cancelled") c[OPEN]!++
    }
    return c
  }, [data])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter(
      (p) =>
        (stage === OPEN ? p.stage !== "Completed" && p.stage !== "Cancelled" : p.stage === stage) &&
        (client === ALL || p.clientId === client) &&
        (service === ALL || p.serviceId === service) &&
        (owner === ALL || p.insight.next.owner === owner) &&
        (!q || `${p.code} ${p.title} ${p.clientName} ${p.vendorName ?? ""} ${p.site.city} ${p.assignedInspectorName ?? ""}`.toLowerCase().includes(q)),
    )
  }, [data, search, stage, client, service, owner])

  const role = useRole()
  const accounts = role === "Accountant"
  const columns = useMemo<Column<ProjectRow>[]>(
    () => accounts ? [
      {
        id: "project",
        header: "Project",
        sortValue: (p) => p.code,
        cell: (p) => (
          <div className="min-w-0 max-w-[14rem] 2xl:max-w-[22rem]">
            <p className="truncate font-medium text-foreground">{p.title}</p>
            {p.description && <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground" title={p.description}>{p.description}</p>}
            <p className="truncate text-xs text-muted-foreground">{p.code} · {p.serviceName}</p>
          </div>
        ),
      },
      {
        id: "client",
        header: "Client",
        sortValue: (p) => p.clientName,
        hideBelow: "md",
        cell: (p) => (
          <div className="min-w-0 max-w-[11rem]">
            <p className="truncate text-sm">{p.clientName}</p>
            <p className="truncate text-xs text-muted-foreground">{p.clientContactName ?? "No contact"}</p>
            {p.clientContactEmail && <p className="truncate text-[11px] text-muted-foreground">{p.clientContactEmail}</p>}
          </div>
        ),
      },
      {
        id: "stage",
        header: "Invoice stage & checkpoint",
        sortValue: (p) => p.billingInsight.index,
        cell: (p) => <BillingProgress insight={p.billingInsight} className="w-56" />,
      },
      { id: "next", header: "Next action", sortValue: (p) => p.billingInsight.next.key, cell: (p) => <BillingNextAction p={p} />, hideBelow: "xl" },
      { id: "due", header: "Amount & due", align: "right", sortValue: (p) => p.billingInsight.dueDate?.date ?? "9999", cell: (p) => <AmountDueCell p={p} /> },
    ] : [
      {
        id: "project",
        header: "Project",
        sortValue: (p) => p.code,
        cell: (p) => (
          <div className="min-w-0 max-w-[16rem] 2xl:max-w-[22rem]">
            <p className="truncate font-medium text-foreground">{p.title}</p>
            <p className="truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</p>
            <p className="truncate text-xs text-muted-foreground">{p.serviceName} · {p.site.city} · {p.coordinatorName.split(" ")[0]}</p>
          </div>
        ),
      },
      {
        id: "stage",
        header: "Stage & checkpoint",
        sortValue: (p) => (p.stage === "Cancelled" ? 99 : p.insight.index),
        cell: (p) => (
          <StageProgress stage={p.stage} checkpoint={p.insight.checkpoint} blocked={p.insight.blocked} />
        ),
      },
      { id: "next", header: "Next action", sortValue: (p) => p.insight.next.owner, cell: (p) => <NextAction p={p} />, hideBelow: "lg" },
      { id: "due", header: "Due", sortValue: (p) => p.insight.nextDate?.date ?? "9999", cell: (p) => <DueChip p={p} /> },
      ...(stage === "Completed" && role !== "Coordinator" ? [{ id: "billing", header: "Billing", cell: (p: ProjectRow) => <StatusBadge status={p.billing.status} /> }] : []),
    ],
    [stage, accounts, role],
  )

  const filtered = !!search || client !== ALL || service !== ALL || owner !== ALL
  const reset = () => { setSearch(""); setClient(ALL); setService(ALL); setOwner(ALL) }
  const tabs: { key: string; label: string }[] = [{ key: OPEN, label: "All open" }, ...STAGES.map((s) => ({ key: s.stage, label: s.short })), { key: "Cancelled", label: "Cancelled" }]

  return (
    <PageContainer>
      <PageHeader
        title="Projects"
        description="One project = one job. Each row shows where the job is, what it's waiting for and when it's due."
        actions={<Can module="projects" action="create"><Button asChild><Link to="/projects/new"><Plus /> New inquiry</Link></Button></Can>}
      />

      <nav aria-label="Filter by stage" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {tabs.map((t, i) => {
            const active = stage === t.key
            return (
              <li key={t.key}>
                <button
                  type="button"
                  onClick={() => setStage(t.key)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "border-transparent bg-gradient-to-r from-[#07a3e7] to-[#1e56c8] text-white" : "bg-card text-foreground hover:border-primary/50",
                  )}
                >
                  {i > 0 && i <= STAGES.length && <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold", active ? "bg-white/25" : "bg-muted text-muted-foreground")}>{i}</span>}
                  {t.label}
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/25" : "bg-muted text-muted-foreground")}>{counts[t.key] ?? 0}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={filtered} onReset={reset}>
            <SearchInput value={search} onChange={setSearch} placeholder="Code, title, client, city, inspector" />
            <FilterSelect label="Client" value={client} onChange={setClient} options={clientOptions} allLabel="All clients" className="sm:w-52" />
            <FilterSelect label="Service" value={service} onChange={setService} options={serviceOptions} allLabel="All services" className="sm:w-52" />
            <FilterSelect label="Waiting on" value={owner} onChange={setOwner} options={OWNERS} allLabel="Anyone" />
          </FilterBar>
        </div>
        {isError ? (
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(p) => p.id}
            loading={isPending}
            onRowClick={(p) => navigate(`/projects/${p.id}`)}
            initialSort={{ id: "due", dir: "asc" }}
            caption="Projects"
            mobileCard={(p) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</p>
                  </div>
                  {accounts ? <AmountDueCell p={p} /> : <DueChip p={p} />}
                </div>
                {accounts ? (
                  <>
                    <p className="text-xs text-muted-foreground">{p.clientContactName ?? "No contact"}</p>
                    <BillingProgress insight={p.billingInsight} className="w-full" />
                    {p.billingInsight.next.key !== "none" && <p className="inline-flex items-center gap-1 text-xs font-medium text-primary-text">Next: {p.billingInsight.next.label} <ArrowRight className="size-3" /></p>}
                  </>
                ) : (
                  <>
                    <StageProgress stage={p.stage} checkpoint={p.insight.checkpoint} blocked={p.insight.blocked} className="w-full" />
                    {p.insight.next.key !== "none" && <p className="inline-flex items-center gap-1 text-xs font-medium text-primary-text">Next: {p.insight.next.label} <ArrowRight className="size-3" /></p>}
                  </>
                )}
              </div>
            )}
            empty={
              filtered || stage !== OPEN ? (
                <EmptyState icon={CalendarClock} title="No projects here" description="Try another stage or clear the filters." action={<Button variant="outline" onClick={() => { reset(); setStage(OPEN) }}>Show all open</Button>} />
              ) : (
                <EmptyState icon={BriefcaseBusiness} title="No projects yet" description="Create an inquiry to start finding inspectors." action={<Can module="projects" action="create"><Button asChild><Link to="/projects/new"><Plus /> New inquiry</Link></Button></Can>} />
              )
            }
          />
        )}
      </Card>
    </PageContainer>
  )
}
