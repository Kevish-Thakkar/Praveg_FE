import { useMemo, useState } from "react"
import { ReceiptText } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { EmptyState } from "@/components/common/EmptyState"
import { Money } from "@/components/common/Money"
import { TextLink } from "@/components/common/TextLink"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { usePOs } from "@/features/execution/hooks"
import { PoDialog } from "./components/PoDialog"
import { formatDate } from "@/lib/dates"
import type { PORow } from "@/services"

/** A PO record opens when an inspector is assigned to a job; the client's PO details are recorded here. */
export function PurchaseOrdersPage() {
  const { data = [], isPending, isError, error, refetch } = usePOs()
  const canEdit = usePermission("purchaseOrders", "edit")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(ALL)
  const [editing, setEditing] = useState<PORow | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.filter((p) => (status === ALL || p.status === status) && (!q || `${p.poNumber} ${p.projectCode} ${p.projectTitle} ${p.clientName}`.toLowerCase().includes(q)))
  }, [data, search, status])

  const columns = useMemo<Column<PORow>[]>(() => [
    { id: "po", header: "PO number", sortValue: (p) => p.poNumber || "~", cell: (p) => (p.poNumber ? <span className="font-medium">{p.poNumber}</span> : <span className="text-muted-foreground italic">Not received</span>) },
    { id: "job", header: "Project", cell: (p) => <div className="max-w-[22rem]" onClick={(e) => e.stopPropagation()}><TextLink to={`/projects/${p.projectId}`}>{p.projectCode}</TextLink><p className="line-clamp-1 text-xs text-muted-foreground">{p.projectTitle}</p></div> },
    { id: "client", header: "Client", hideBelow: "lg", sortValue: (p) => p.clientName, cell: (p) => p.clientName },
    { id: "date", header: "PO date", hideBelow: "md", sortValue: (p) => p.issueDate ?? "", cell: (p) => formatDate(p.issueDate) },
    { id: "amount", header: "Amount", align: "right", sortValue: (p) => p.amount, cell: (p) => <Money amount={p.amount} currency={p.currency} /> },
    { id: "status", header: "Status", sortValue: (p) => p.status, cell: (p) => <StatusBadge status={p.status} /> },
  ], [])

  return (
    <PageContainer>
      <PageHeader title="Purchase orders" description="A PO record opens when an inspector is assigned. Click a row to record the client's PO." />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={!!search || status !== ALL} onReset={() => { setSearch(""); setStatus(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="PO number, project, client" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={["Awaiting PO", "Received", "Invoiced", "Closed"]} allLabel="All statuses" />
          </FilterBar>
        </div>
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} getRowId={(p) => p.id} loading={isPending} onRowClick={canEdit ? setEditing : undefined} caption="Purchase orders"
            mobileCard={(p) => <div className="space-y-1"><div className="flex justify-between gap-2"><p className="font-medium">{p.poNumber || "PO not received"}</p><StatusBadge status={p.status} /></div><p className="text-xs text-muted-foreground">{p.projectCode} · {p.clientName}</p><Money amount={p.amount} currency={p.currency} className="text-sm" /></div>}
            empty={<EmptyState icon={ReceiptText} title="No purchase orders" description="A PO record opens automatically when an inspector is assigned." />}
          />
        )}
      </Card>
      <PoDialog po={editing} onClose={() => setEditing(null)} />
    </PageContainer>
  )
}
