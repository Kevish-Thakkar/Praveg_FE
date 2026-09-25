import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Check, Clock3, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Money } from "@/components/common/Money"
import { ActionMenu } from "@/components/common/ActionMenu"
import { StatCard } from "@/components/common/StatCard"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ComboboxField, DateField, FormGrid, NumberField, SelectField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { formatDate, todayISO } from "@/lib/dates"
import { useProjects } from "@/features/projects/hooks"
import { useLookupOptions } from "@/features/settings/lookups"
import { useCreateTimeEntry, useSetTimeStatus, useTimeEntries } from "@/features/finance/hooks"
import type { TimeRow } from "@/services"

/** Workflow diagram step 5 — "Operations & Time Management (Inspector Time, Expenses, etc.)" */
export function OperationsPage() {
  const q = useTimeEntries()
  const setStatus = useSetTimeStatus()
  const canCreate = usePermission("operations", "create")
  const canApprove = usePermission("operations", "edit")
  const [adding, setAdding] = useState(false)
  const rows = q.data ?? []
  const pending = rows.filter((r) => r.status === "Submitted").length
  const hours = rows.reduce((s, r) => s + r.hours, 0)

  const columns = useMemo<Column<TimeRow>[]>(() => [
    { id: "date", header: "Date", sortValue: (t) => t.date, cell: (t) => formatDate(t.date) },
    { id: "who", header: "Inspector", sortValue: (t) => t.inspectorName, cell: (t) => <div><p className="font-medium">{t.inspectorName}</p><p className="text-xs text-muted-foreground">{t.projectCode}</p></div> },
    { id: "hours", header: "Hours", align: "right", sortValue: (t) => t.hours, cell: (t) => <span className="tabular-nums">{t.hours}</span> },
    { id: "exp", header: "Expense", align: "right", hideBelow: "sm", cell: (t) => <div><Money amount={t.expenseAmount} currency={t.currency} /><p className="text-xs text-muted-foreground">{t.expenseCategory ?? "—"}</p></div> },
    { id: "notes", header: "Notes", hideBelow: "lg", cell: (t) => <span className="text-muted-foreground">{t.notes || "—"}</span> },
    { id: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
    { id: "a", header: "", className: "w-12", cell: (t) => <ActionMenu items={[
      { label: "Approve", icon: Check, hidden: !canApprove || t.status !== "Submitted", onSelect: () => setStatus.mutate({ id: t.id, status: "Approved" }) },
      { label: "Reject", icon: X, destructive: true, hidden: !canApprove || t.status !== "Submitted", onSelect: () => setStatus.mutate({ id: t.id, status: "Rejected" }) },
    ]} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canApprove])

  return (
    <PageContainer>
      <PageHeader title="Operations & time" description="Inspector time and expenses for outsourced, supplier-based and freelance inspectors." actions={canCreate && <Button onClick={() => setAdding(true)}><Plus /> Log time & expense</Button>} />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" aria-label="Summary">
        <StatCard label="Entries" value={rows.length} icon={Clock3} />
        <StatCard label="Hours logged" value={hours} icon={Clock3} />
        <StatCard label="Awaiting approval" value={pending} icon={Check} emphasis={pending ? "attention" : "default"} />
      </section>
      <Card className="gap-0 overflow-hidden py-0">
        {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <DataTable rows={rows} columns={columns} getRowId={(t) => t.id} loading={q.isPending} initialSort={{ id: "date", dir: "desc" }} caption="Time and expense entries"
            empty={<EmptyState icon={Clock3} title="No time entries yet" action={canCreate && <Button onClick={() => setAdding(true)}><Plus /> Log time & expense</Button>} />} />
        )}
      </Card>
      {adding && <AddEntryDialog onClose={() => setAdding(false)} />}
    </PageContainer>
  )
}

const schema = z.object({
  projectId: z.string().min(1, "Select a project"),
  inspectorId: z.string().min(1, "Select an inspector"),
  date: z.string({ error: "Date is required" }).min(1, "Date is required"),
  hours: z.number({ error: "Hours are required" }).positive("Must be greater than 0").max(24, "Max 24 hours per entry"),
  expenseCategory: z.enum(["Travel", "Accommodation", "Per Diem", "Other"]),
  expenseAmount: z.number({ error: "Enter 0 if none" }).min(0),
  currency: z.string().min(1, "Select a currency"),
  notes: z.string().max(200),
})
type V = z.infer<typeof schema>

function AddEntryDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateTimeEntry()
  const projects = useProjects()
  const { inspectorOptions, currencyOptions } = useLookupOptions()
  const options = useMemo(() => (projects.data ?? []).filter((p) => p.assignedInspectorId).map((p) => ({ value: p.id, label: `${p.code} · ${p.title}` })), [projects.data])
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { projectId: "", inspectorId: "", date: todayISO(), hours: 8, expenseCategory: "Travel", expenseAmount: 0, currency: "INR", notes: "" } })
  const projectId = useWatch({ control: form.control, name: "projectId" })
  const proj = projects.data?.find((p) => p.id === projectId)
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Log time & expense" formId="time-form" submitLabel="Submit entry" loading={create.isPending} size="lg">
      <Form {...form}>
        <form id="time-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => create.mutate(v, { onSuccess: onClose }))}>
          <ComboboxField control={form.control} name="projectId" label="Project" required options={options} />
          <FormGrid>
            <ComboboxField control={form.control} name="inspectorId" label="Inspector" required options={proj ? inspectorOptions.filter((o) => o.value === proj.assignedInspectorId) : inspectorOptions} />
            <DateField control={form.control} name="date" label="Date" required />
            <NumberField control={form.control} name="hours" label="Hours" required step="0.5" />
            <SelectField control={form.control} name="expenseCategory" label="Expense category" required options={["Travel", "Accommodation", "Per Diem", "Other"]} />
            <NumberField control={form.control} name="expenseAmount" label="Expense amount" required />
            <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
          </FormGrid>
          <TextField control={form.control} name="notes" label="Notes" />
        </form>
      </Form>
    </FormDialog>
  )
}
