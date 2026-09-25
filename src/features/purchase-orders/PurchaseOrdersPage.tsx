import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ReceiptText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
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
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, FormGrid, NumberField, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useLookupOptions } from "@/features/settings/lookups"
import { useSavePO, usePOs } from "@/features/execution/hooks"
import { formatDate } from "@/lib/dates"
import type { PORow } from "@/services"

const schema = z.object({
  poNumber: z.string().trim().max(60),
  issueDate: z.string().nullable(),
  amount: z.number({ error: "Amount is required" }).min(0),
  currency: z.string().min(1),
  status: z.enum(["Awaiting PO", "Received", "Invoiced", "Closed"]),
  notes: z.string().max(500),
}).refine((v) => v.status === "Awaiting PO" || (v.poNumber.length >= 2 && !!v.issueDate), { path: ["poNumber"], message: "Enter the PO number and date once received" })
type Values = z.infer<typeof schema>

/** A PO record opens when an inspector is assigned to a job; the client's PO details are recorded here. */
export function PurchaseOrdersPage() {
  const { data = [], isPending, isError, error, refetch } = usePOs()
  const canEdit = usePermission("purchaseOrders", "edit")
  const { currencyOptions } = useLookupOptions()
  const save = useSavePO()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState(ALL)
  const [editing, setEditing] = useState<PORow | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (editing) form.reset({ poNumber: editing.poNumber, issueDate: editing.issueDate, amount: editing.amount, currency: editing.currency, status: editing.status === "Awaiting PO" ? "Received" : editing.status, notes: editing.notes })
  }, [editing, form])

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
          <DataTable rows={rows} columns={columns} getRowId={(p) => p.id} loading={isPending} onRowClick={canEdit ? setEditing : undefined} caption="Purchase orders"
            mobileCard={(p) => <div className="space-y-1"><div className="flex justify-between gap-2"><p className="font-medium">{p.poNumber || "PO not received"}</p><StatusBadge status={p.status} /></div><p className="text-xs text-muted-foreground">{p.projectCode} · {p.clientName}</p><Money amount={p.amount} currency={p.currency} className="text-sm" /></div>}
            empty={<EmptyState icon={ReceiptText} title="No purchase orders" description="A PO record opens automatically when an inspector is assigned." />}
          />
        )}
      </Card>
      <FormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing?.poNumber ? `PO ${editing.poNumber}` : "Record client PO"} description={editing ? `${editing.projectCode} · ${editing.clientName}` : ""} formId="po-form" loading={save.isPending}>
        <Form {...form}>
          <form id="po-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => editing && save.mutate({ projectId: editing.projectId, input: v }, { onSuccess: () => setEditing(null) }))}>
            <FormGrid>
              <TextField control={form.control} name="poNumber" label="PO number" />
              <DateField control={form.control} name="issueDate" label="PO date" />
              <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
              <NumberField control={form.control} name="amount" label="PO amount" required />
              <SelectField control={form.control} name="status" label="Status" required options={["Awaiting PO", "Received", "Invoiced", "Closed"]} />
            </FormGrid>
            <TextareaField control={form.control} name="notes" label="Notes" rows={2} />
          </form>
        </Form>
      </FormDialog>
    </PageContainer>
  )
}
