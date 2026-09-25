import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { BillingProgress } from "@/components/common/StageProgress"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { SearchInput } from "@/components/common/SearchInput"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, FormGrid, NumberField, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { ErrorState } from "@/components/feedback/ErrorState"
import { PresetComposer } from "@/features/emails/components/PresetComposer"
import { PricingPanel } from "@/features/projects/components/workflow/PricingPanel"
import { useProjects } from "@/features/projects/hooks"
import { useLookupOptions } from "@/features/settings/lookups"
import { useSettings } from "@/features/settings/hooks"
import { formatDate, todayISO } from "@/lib/dates"
import type { BillingNextKey } from "@/lib/workflow"
import { formatMoney, toFileMeta } from "@/lib/format"
import { addDays, type BillingRow, type ProjectRow } from "@/services"
import { cn } from "@/lib/utils"
import { IncomeKpis } from "./components/IncomeKpis"
import { CountryFilter, useCountryFilter } from "@/components/charts/CountryFilter"
import { useRole } from "@/store/session.store"
import { AmountDueCell, BillingNextAction, CompletionCell } from "./components/BillingCells"
import { useBilling, useConfirmPayment, useIncome, useSendPaymentEmail, useUploadInvoice } from "./hooks"

const TABS = ["all", "price", "job", "invoice", "payments", "paid"] as const
const TAB_LABEL: Record<(typeof TABS)[number], string> = { all: "All", price: "Pricing", job: "Job in progress", invoice: "Invoice pending", payments: "Awaiting payment", paid: "Paid" }
const TAB_INDEX: Record<string, number> = { price: 0, job: 1, invoice: 2, payments: 3, paid: 4 }

/** Default order = what needs Accounts first: overdue, due soon, awaiting, to invoice, pricing, in progress, paid. */
const urgency = (p: ProjectRow) => {
  const b = p.billingInsight
  const byStep = [30, 50, 20, 10, 90][b.index] ?? 99
  const tone = b.due?.tone === "danger" ? -8 : b.due?.tone === "warning" ? -4 : 0
  return byStep + tone + (b.dueDate ? Number(b.dueDate.date.replaceAll("-", "")) / 1e9 : 0)
}

/**
 * Accounts workspace. One listing in the same style as the project board, but the stage & checkpoint
 * follow the invoice flow: Pricing → Job in progress → Invoice pending → Awaiting payment → Paid.
 */
export function FinancePage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get("tab")
  const tab = (raw === "pricing" ? "price" : TABS.includes(raw as never) ? raw : "all") as (typeof TABS)[number]
  const setTab = (t: string) => setParams((prev) => { const n = new URLSearchParams(prev); n.set("tab", t); return n }, { replace: true })
  const projects = useProjects()
  const billing = useBilling()
  const superAdmin = useRole() === "Super Admin"
  const income = useIncome(superAdmin)
  const [country, setCountry] = useCountryFilter()
  const canEdit = usePermission("billing", "edit")
  const canPrice = usePermission("pricing", "edit")
  const [search, setSearch] = useState("")
  const [client, setClient] = useState(ALL)
  const [priceFor, setPriceFor] = useState<ProjectRow | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<BillingRow | null>(null)
  const [payFor, setPayFor] = useState<BillingRow | null>(null)
  const [mailFor, setMailFor] = useState<{ row: BillingRow; kind: "Reminder" | "Follow-up" } | null>(null)
  const sendMail = useSendPaymentEmail()

  const billingById = useMemo(() => new Map((billing.data ?? []).map((r) => [r.projectId, r])), [billing.data])
  /** projects Accounts cares about: priced or price requested, not cancelled */
  const relevant = useMemo(
    () => (projects.data ?? []).filter((p) => p.stage !== "Cancelled" && (p.stage !== "Inquiry" || !!p.pricingRequestedAt || !!p.pricing)),
    [projects.data],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: relevant.length }
    for (const p of relevant) { const k = TABS[p.billingInsight.index + 1]; if (k) c[k] = (c[k] ?? 0) + 1 }
    return c
  }, [relevant])
  const clientOptions = useMemo(() => [...new Map(relevant.map((p) => [p.clientId, p.clientName])).entries()].map(([value, label]) => ({ value, label })), [relevant])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return relevant.filter((p) =>
      (tab === "all" || p.billingInsight.index === TAB_INDEX[tab]) &&
      (client === ALL || p.clientId === client) &&
      (!q || `${p.code} ${p.title} ${p.description} ${p.clientName} ${p.clientContactName ?? ""} ${p.assignedInspectorName ?? ""} ${p.billing.invoice?.number ?? ""}`.toLowerCase().includes(q)))
  }, [relevant, tab, client, search])

  const act = (p: ProjectRow, key: BillingNextKey) => {
    const r = billingById.get(p.id)
    if (key === "setPrice") return canPrice && setPriceFor(p)
    if (!canEdit || !r) return
    if (key === "uploadInvoice") setInvoiceFor(r)
    else if (key === "remind") setMailFor({ row: r, kind: "Reminder" })
    else if (key === "followUp") setMailFor({ row: r, kind: "Follow-up" })
    else if (key === "confirmPayment") setPayFor(r)
  }

  // deep link from the project board / dashboard: ?project=&action=
  useEffect(() => {
    const id = params.get("project")
    if (!id || !projects.data || !billing.data) return
    const p = projects.data.find((x) => x.id === id)
    if (p) {
      const k = TABS[p.billingInsight.index + 1]
      if (k) setTab(k)
      act(p, (params.get("action") as BillingNextKey | null) ?? p.billingInsight.next.key)
    }
    setParams((prev) => { const n = new URLSearchParams(prev); n.delete("project"); n.delete("action"); return n }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.data, billing.data])

  const columns = useMemo<Column<ProjectRow>[]>(() => [
    {
      id: "project", header: "Project", sortValue: (p) => p.code,
      cell: (p) => (
        <div className="min-w-0 max-w-[11rem] 2xl:max-w-[18rem]">
          <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-foreground hover:underline">{p.title}</Link>
          {p.description && <p className="line-clamp-2 text-xs whitespace-normal text-muted-foreground" title={p.description}>{p.description}</p>}
          <p className="truncate text-xs text-muted-foreground">{p.code} · {p.serviceName}</p>
        </div>
      ),
    },
    {
      id: "client", header: "Client", sortValue: (p) => p.clientName, hideBelow: "md",
      cell: (p) => (
        <div className="min-w-0 max-w-[9rem] 2xl:max-w-[12rem]">
          <p className="truncate text-sm">{p.clientName}</p>
          <p className="truncate text-xs text-muted-foreground">{p.clientContactName ?? "No contact"}</p>
          {p.clientContactEmail && <p className="truncate text-[11px] text-muted-foreground">{p.clientContactEmail}</p>}
        </div>
      ),
    },
    { id: "inspector", header: "Inspector", sortValue: (p) => p.assignedInspectorName ?? "~", hideBelow: "2xl", cell: (p) => <span className="block max-w-[8rem] text-sm whitespace-normal">{p.assignedInspectorName ?? <span className="text-muted-foreground">Not assigned</span>}</span> },
    { id: "completed", header: "Job completed", sortValue: (p) => p.completion.completionEmailSentAt ?? p.completion.jobDoneAt ?? "~", hideBelow: "lg", cell: (p) => <CompletionCell p={p} withInspector /> },
    { id: "stage", header: "Stage & checkpoint", sortValue: urgency, cell: (p) => <BillingProgress insight={p.billingInsight} className="w-48" /> },
    { id: "next", header: "Next action", sortValue: (p) => p.billingInsight.next.key, cell: (p) => <BillingNextAction p={p} onAction={(k) => act(p, k)} className="w-40" /> },
    { id: "amount", header: "Amount & due", align: "right", sortValue: (p) => p.billingInsight.dueDate?.date ?? "9999", cell: (p) => <AmountDueCell p={p} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [billingById, canEdit, canPrice])

  return (
    <PageContainer>
      <PageHeader title="Invoicing & payments" description="Every priced or completed project in the invoice flow: set the client price, upload the invoice, follow up by due date and confirm payment." />
      {superAdmin && income.data && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Income</h2>
            <CountryFilter value={country} onChange={setCountry} />
          </div>
          <IncomeKpis income={income.data} country={country} />
        </section>
      )}

      <nav aria-label="Filter by invoice step" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2">
          {TABS.map((t, i) => {
            const active = tab === t
            return (
              <li key={t}>
                <button type="button" onClick={() => setTab(t)} aria-pressed={active}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    active ? "border-transparent bg-gradient-to-r from-[#07a3e7] to-[#1e56c8] text-white" : "bg-card text-foreground hover:border-primary/50")}>
                  {i > 0 && <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px] font-bold", active ? "bg-white/25" : "bg-muted text-muted-foreground")}>{i}</span>}
                  {TAB_LABEL[t]}
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/25" : "bg-muted text-muted-foreground")}>{counts[t] ?? 0}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={!!search || client !== ALL} onReset={() => { setSearch(""); setClient(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Project, client, contact, inspector, invoice no." />
            <FilterSelect label="Client" value={client} onChange={setClient} options={clientOptions} allLabel="All clients" className="sm:w-56" />
          </FilterBar>
        </div>
        {projects.isError ? <ErrorState message={projects.error.message} onRetry={() => void projects.refetch()} /> : (
          <DataTable rows={rows} columns={columns} getRowId={(p) => p.id} loading={projects.isPending || billing.isPending} caption="Invoice flow" initialSort={{ id: "stage", dir: "asc" }}
            mobileCard={(p) => (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate font-medium">{p.title}</p><p className="truncate text-xs text-muted-foreground">{p.code} · {p.clientName} · {p.clientContactName ?? "—"}</p></div>
                  <AmountDueCell p={p} />
                </div>
                <BillingProgress insight={p.billingInsight} className="w-full" />
                <BillingNextAction p={p} onAction={(k) => act(p, k)} />
              </div>
            )}
            empty={<EmptyState icon={Wallet} title="Nothing here" description="Try another step or clear the filters." />}
          />
        )}
      </Card>

      {priceFor && <PricingPanel p={priceFor} inspectors={[]} dialogOnly open onOpenChange={(o) => !o && setPriceFor(null)} />}
      <InvoiceDialog row={invoiceFor} onClose={() => setInvoiceFor(null)} />
      <PaymentDialog row={payFor} onClose={() => setPayFor(null)} />
      {mailFor && (
        <PresetComposer
          open onOpenChange={(o) => !o && setMailFor(null)} projectId={mailFor.row.projectId}
          kind={mailFor.kind === "Reminder" ? "Payment Reminder" : "Payment Follow-up"}
          title={mailFor.kind === "Reminder" ? `Payment reminder — ${mailFor.row.invoice?.number}` : `Payment follow-up — ${mailFor.row.invoice?.number}`}
          description={`Due ${formatDate(mailFor.row.invoice?.dueDate)} · the invoice is attached.`}
          sendLabel={mailFor.kind === "Reminder" ? "Send reminder" : "Send follow-up"} sending={sendMail.isPending}
          onSend={(email) => sendMail.mutate({ projectId: mailFor.row.projectId, kind: mailFor.kind, email }, { onSuccess: () => setMailFor(null) })}
        />
      )}
    </PageContainer>
  )
}

const invoiceSchema = z.object({
  number: z.string().trim().min(2, "Invoice number is required"),
  date: z.string().min(1, "Invoice date is required"),
  jobName: z.string().trim().min(2, "Project name is required"),
  amount: z.number({ error: "Amount is required" }).positive("Must be more than 0"),
  taxAmount: z.number({ error: "Enter tax (0 if none)" }).min(0),
  currency: z.string().min(1),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().max(500),
})
type InvoiceValues = z.infer<typeof invoiceSchema>

function InvoiceDialog({ row, onClose }: { row: BillingRow | null; onClose: () => void }) {
  const upload = useUploadInvoice()
  const settings = useSettings()
  const { currencyOptions } = useLookupOptions()
  const [file, setFile] = useState<File[]>([])
  const [fileError, setFileError] = useState(false)
  const form = useForm<InvoiceValues>({ resolver: zodResolver(invoiceSchema) })
  const [date, amount, tax, cur] = useWatch({ control: form.control, name: ["date", "amount", "taxAmount", "currency"] })
  useEffect(() => {
    if (!row) return
    const gst = row.currency === "INR" ? settings.data?.defaultGstRate ?? 18 : 0
    const today = todayISO()
    form.reset({ number: "", date: today, jobName: `${row.title} (${row.code})`, amount: row.priceTotal, taxAmount: Math.round((row.priceTotal * gst) / 100), currency: row.currency, dueDate: addDays(today, row.paymentTermsDays), notes: "" })
    setFile([]); setFileError(false)
  }, [row, form, settings.data])
  // keep due date = invoice date + terms while the user hasn't typed a custom one
  useEffect(() => { if (row && date) form.setValue("dueDate", addDays(date, row.paymentTermsDays)) }, [date, row, form])

  return (
    <FormDialog open={!!row} onOpenChange={(o) => !o && onClose()} size="lg" title="Upload invoice" description={row ? `${row.clientName} · payment terms ${row.paymentTermsDays} days. Create the invoice in your accounting system, then record it here.` : ""} formId="invoice-form" submitLabel="Save invoice" loading={upload.isPending}>
      <Form {...form}>
        <form id="invoice-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => {
          if (!file[0]) return setFileError(true)
          upload.mutate({ projectId: row!.projectId, input: v, file: toFileMeta(file[0]) }, { onSuccess: onClose })
        }, () => !file[0] && setFileError(true))}>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Invoice file <span className="text-danger" aria-hidden>*</span></p>
            <FileDropzone files={file} onChange={(f) => { setFile(f); setFileError(false) }} multiple={false} accept=".pdf,.jpg,.jpeg,.png" maxSizeMb={10} hint="PDF or image · up to 10 MB" invalid={fileError} />
            {fileError && <p className="text-sm text-danger" role="alert">Attach the invoice file</p>}
          </div>
          <FormGrid>
            <TextField control={form.control} name="number" label="Invoice number" required placeholder="e.g. PCS/24-25/0142" />
            <DateField control={form.control} name="date" label="Invoice date" required />
            <TextField control={form.control} name="jobName" label="Project name" required className="sm:col-span-2" />
            <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
            <NumberField control={form.control} name="amount" label="Amount (before tax)" required prefix={cur} />
            <NumberField control={form.control} name="taxAmount" label={cur === "INR" ? "GST amount" : "VAT amount"} required prefix={cur} description={cur === "INR" ? "Pre-filled at the default GST rate" : "Enter VAT if applicable"} />
            <DateField control={form.control} name="dueDate" label="Payment due date" required description={row ? `Invoice date + ${row.paymentTermsDays} days` : undefined} />
          </FormGrid>
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"><span className="text-muted-foreground">Invoice total</span><span className="font-semibold tabular-nums">{formatMoney((amount || 0) + (tax || 0), cur || "INR")}</span></div>
          <TextareaField control={form.control} name="notes" label="Notes" rows={2} />
        </form>
      </Form>
    </FormDialog>
  )
}

const paymentSchema = z.object({
  amount: z.number({ error: "Amount is required" }).positive("Must be more than 0"),
  date: z.string().min(1, "Payment date is required"),
  method: z.enum(["Bank Transfer", "Cheque", "UPI", "Wire (SWIFT)"]),
  reference: z.string().trim().min(2, "Reference / UTR is required"),
})
type PaymentValues = z.infer<typeof paymentSchema>

function PaymentDialog({ row, onClose }: { row: BillingRow | null; onClose: () => void }) {
  const confirm = useConfirmPayment()
  const form = useForm<PaymentValues>({ resolver: zodResolver(paymentSchema) })
  const amount = useWatch({ control: form.control, name: "amount" })
  useEffect(() => {
    if (row?.invoice) form.reset({ amount: row.invoice.total, date: todayISO(), method: row.invoice.currency === "INR" ? "Bank Transfer" : "Wire (SWIFT)", reference: "" })
  }, [row, form])
  const short = row?.invoice && amount && amount < row.invoice.total
  return (
    <FormDialog open={!!row} onOpenChange={(o) => !o && onClose()} title="Confirm payment" description={row?.invoice ? `${row.invoice.number} · ${row.clientName} · ${formatMoney(row.invoice.total, row.invoice.currency)}` : ""} formId="payment-form" submitLabel="Confirm payment" loading={confirm.isPending}>
      <Form {...form}>
        <form id="payment-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => confirm.mutate({ projectId: row!.projectId, input: v }, { onSuccess: onClose }))}>
          <FormGrid>
            <NumberField control={form.control} name="amount" label="Amount received" required prefix={row?.invoice?.currency} />
            <DateField control={form.control} name="date" label="Payment date" required />
            <SelectField control={form.control} name="method" label="Method" required options={["Bank Transfer", "Cheque", "UPI", "Wire (SWIFT)"]} />
            <TextField control={form.control} name="reference" label="Reference / UTR" required />
          </FormGrid>
          {short && <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">The amount is less than the invoice total. Check for TDS or a short payment before confirming.</p>}
        </form>
      </Form>
    </FormDialog>
  )
}
