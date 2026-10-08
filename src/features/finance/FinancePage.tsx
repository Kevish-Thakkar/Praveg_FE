import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Wallet } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { ListToolbar, type FilterDef } from "@/components/tables/ListToolbar"
import { EmptyState } from "@/components/common/EmptyState"
import { CheckpointTrail } from "@/components/workflow/ProjectWorkflow"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useProjects } from "@/features/projects/hooks"
import { usePOs } from "@/features/execution/hooks"
import { useHiddenColumns, useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { closedAt, type BillingNextKey } from "@/lib/workflow"
import { financeTrack } from "@/lib/project-workflow"
import { exportCsv } from "@/lib/csv"
import { formatDate } from "@/lib/dates"
import type { PORow, ProjectRow } from "@/services"
import { IncomeKpis } from "./components/IncomeKpis"
import { CountryFilter, useCountryFilter } from "@/components/charts/CountryFilter"
import { useRole } from "@/store/session.store"
import { AmountDueCell, BillingNextAction, CompletionCell } from "./components/BillingCells"
import { useBillingActions } from "./components/BillingActions"
import { useIncome } from "./hooks"
import { ProjectCheckpointSheet } from "@/features/projects/components/workspace/ProjectStepOverlay"

/** Accounts status of a project — the values dashboard links use (?tab=payments). */
const STEPS = [
  { value: "price", label: "Pricing", index: 0 },
  { value: "job", label: "Job in progress", index: 1 },
  { value: "invoice", label: "Invoice pending", index: 2 },
  { value: "payments", label: "Awaiting payment", index: 3 },
  { value: "paid", label: "Paid", index: 4 },
] as const
const FILTER_KEYS = ["tab", "client"] as const

/** Default order = what needs Accounts first: overdue, due soon, awaiting, to invoice, pricing, in progress, paid. */
const urgency = (p: ProjectRow) => {
  const b = p.billingInsight
  const byStep = [30, 50, 20, 10, 90][b.index] ?? 99
  const tone = b.due?.tone === "danger" ? -8 : b.due?.tone === "warning" ? -4 : 0
  return byStep + tone + (b.dueDate ? Number(b.dueDate.date.replaceAll("-", "")) / 1e9 : 0)
}

/**
 * Accounts workspace. Same listing pattern as Projects; the checkpoint trail follows the Accounts track
 * (Client pricing → Purchase order → Job completion → Invoicing → Payment collection).
 */
export function FinancePage() {
  const [params, setParams] = useSearchParams()
  const projects = useProjects()
  const pos = usePOs()
  const superAdmin = useRole() === "Super Admin"
  const income = useIncome(superAdmin)
  const [country, setCountry] = useCountryFilter()
  const [search, setSearch] = useUrlSearch()
  const filters = useUrlFilters(FILTER_KEYS)
  const [hidden, setHidden] = useHiddenColumns("finance")
  const billingActions = useBillingActions()
  const [sheet, setSheet] = useState<string | null>(null)
  // legacy link values (?tab=pricing, ?tab=all)
  const steps = filters.values.tab.map((t) => (t === "pricing" ? "price" : t === "all" ? "" : t)).filter(Boolean)

  const posByProject = useMemo(() => {
    const m = new Map<string, PORow[]>()
    for (const po of pos.data ?? []) m.set(po.projectId, [...(m.get(po.projectId) ?? []), po])
    return m
  }, [pos.data])

  /** projects Accounts cares about: priced or price requested, not cancelled */
  const relevant = useMemo(
    () => (projects.data ?? []).filter((p) => p.stage !== "Cancelled" && (p.stage !== "Inquiry" || !!p.pricingRequestedAt || !!p.pricing)),
    [projects.data],
  )
  const clientOptions = useMemo(
    () => [...new Map(relevant.map((p) => [p.clientId, p.clientName])).entries()]
      .map(([value, label]) => ({ value, label, count: relevant.filter((p) => p.clientId === value).length }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [relevant],
  )
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const idx = new Set<number | undefined>(steps.map((s) => STEPS.find((x) => x.value === s)?.index))
    return relevant.filter((p) =>
      (!idx.size || idx.has(p.billingInsight.index)) &&
      (!filters.values.client.length || filters.values.client.includes(p.clientId)) &&
      (!q || `${p.code} ${p.title} ${p.description} ${p.clientName} ${p.clientContactName ?? ""} ${p.assignedInspectorName ?? ""} ${p.billing.invoice?.number ?? ""}`.toLowerCase().includes(q)))
  }, [relevant, steps, filters.values.client, search])

  const act = (p: ProjectRow, key: BillingNextKey) => billingActions.run(p, key)

  // deep link from the project board / dashboard: ?project=&action=
  useEffect(() => {
    const id = params.get("project")
    if (!id || !projects.data || !billingActions.ready) return
    const p = projects.data.find((x) => x.id === id)
    if (p) act(p, (params.get("action") as BillingNextKey | null) ?? p.billingInsight.next.key)
    setParams((prev) => { const n = new URLSearchParams(prev); n.delete("project"); n.delete("action"); return n }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.data, billingActions.ready])

  const columns = useMemo<Column<ProjectRow>[]>(() => [
    {
      id: "project", header: "Project", sortValue: (p) => p.code, exportValue: (p) => `${p.code} — ${p.title}`,
      cell: (p) => (
        <div className="min-w-0 max-w-[12rem] 2xl:max-w-[18rem]">
          <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-foreground hover:text-primary-strong hover:underline">{p.title}</Link>
          {p.description && <p className="mt-0.5 line-clamp-2 text-xs whitespace-normal text-muted-foreground" title={p.description}>{p.description}</p>}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.code} · {p.serviceName}</p>
        </div>
      ),
    },
    {
      id: "client", header: "Client", sortValue: (p) => p.clientName, hideBelow: "md", exportValue: (p) => `${p.clientName}${p.clientContactName ? ` (${p.clientContactName})` : ""}`,
      cell: (p) => (
        <div className="min-w-0 max-w-[10rem] 2xl:max-w-[13rem]">
          <p className="truncate text-sm">{p.clientName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.clientContactName ?? "No contact"}</p>
        </div>
      ),
    },
    { id: "inspector", header: "Inspector", sortValue: (p) => p.assignedInspectorName ?? "~", hideBelow: "2xl", cell: (p) => <span className="block max-w-[8rem] text-sm whitespace-normal">{p.assignedInspectorName ?? <span className="text-muted-foreground">Not assigned</span>}</span> },
    { id: "completed", header: "Job completed", sortValue: (p) => closedAt(p) ?? p.completion.completionEmailSentAt ?? p.completion.jobDoneAt ?? "~", exportValue: (p) => { const at = closedAt(p); return at ? formatDate(at) : "" }, hideBelow: "lg", cell: (p) => <CompletionCell p={p} withInspector /> },
    { id: "stage", header: "Accounts progress", sortValue: urgency, exportValue: (p) => p.billingInsight.label, cell: (p) => (
      <div className="space-y-3">
        <CheckpointTrail list={financeTrack({ p, pos: posByProject.get(p.id) })} className="w-52" onOpen={() => setSheet(p.id)} />
        {/* below 2xl the Next action column is folded in here so the table fits without scrolling */}
        <div className="2xl:hidden"><BillingNextAction p={p} onAction={(k) => act(p, k)} className="w-52" /></div>
      </div>
    ) },
    { id: "next", header: "Next action", sortValue: (p) => p.billingInsight.next.key, exportValue: (p) => p.billingInsight.next.label, hideBelow: "2xl", cell: (p) => <BillingNextAction p={p} onAction={(k) => act(p, k)} className="w-44" /> },
    { id: "amount", header: "Amount & due", align: "right", sortValue: (p) => p.billingInsight.dueDate?.date ?? "9999", exportValue: (p) => p.billing.invoice?.total ?? p.priceTotal, cell: (p) => <AmountDueCell p={p} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [posByProject, billingActions.run])

  const filterDefs: FilterDef[] = [
    { id: "tab", label: "Accounts status", options: STEPS.map((s) => ({ value: s.value, label: s.label, count: relevant.filter((p) => p.billingInsight.index === s.index).length })), value: steps, onChange: (v) => filters.set("tab", v) },
    { id: "client", label: "Client", options: clientOptions, value: filters.values.client, onChange: (v) => filters.set("client", v) },
  ]

  return (
    <PageContainer>
      <PageHeader title="Invoicing & payments" description="Every priced or completed project: set the client price, record the PO and invoice, follow up by due date and confirm payment." />
      {superAdmin && income.data && (
        <section className="space-y-4" aria-labelledby="income-h">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="income-h" className="text-lg font-semibold">Income</h2>
            <CountryFilter value={country} onChange={setCountry} />
          </div>
          <IncomeKpis income={income.data} country={country} />
        </section>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search project, client, inspector or invoice no." }}
          filters={filterDefs}
          onClearFilters={filters.clear}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("invoicing", rows, columns)}
        />
        {projects.isError ? <ErrorState message={projects.error.message} onRetry={() => void projects.refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} hiddenColumns={hidden} getRowId={(p) => p.id} loading={projects.isPending || !billingActions.ready} caption="Invoicing and payments" initialSort={{ id: "stage", dir: "asc" }}
            mobileCard={(p) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-medium">{p.title}</p><p className="truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</p></div>
                  <AmountDueCell p={p} />
                </div>
                <CheckpointTrail list={financeTrack({ p, pos: posByProject.get(p.id) })} className="w-full" onOpen={() => setSheet(p.id)} />
                <BillingNextAction p={p} onAction={(k) => act(p, k)} className="w-full" />
              </div>
            )}
            empty={<EmptyState icon={Wallet} title="Nothing matches" description="Try another status or clear the filters." />}
          />
        )}
      </Card>
      {billingActions.dialogs}
      {sheet && <ProjectCheckpointSheet key={sheet} projectId={sheet} track="finance" onClose={() => setSheet(null)} />}
    </PageContainer>
  )
}
