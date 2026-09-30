import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form } from "@/components/ui/form"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, FormGrid, NumberField, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { PresetComposer } from "@/features/emails/components/PresetComposer"
import { PricingPanel } from "@/features/projects/components/workflow/PricingPanel"
import { useCandidates } from "@/features/projects/hooks"
import { useLookupOptions } from "@/features/settings/lookups"
import { useSettings } from "@/features/settings/hooks"
import { formatDate, todayISO } from "@/lib/dates"
import type { BillingNextKey } from "@/lib/workflow"
import { formatMoney, toFileMeta } from "@/lib/format"
import { addDays, type BillingRow, type ProjectRow } from "@/services"
import { useBilling, useConfirmPayment, useSendPaymentEmail, useUploadInvoice } from "../hooks"
import { usePOs } from "@/features/execution/hooks"
import { ReceiptText } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Accounts actions (set price, upload invoice, reminder / follow-up, confirm payment) as one hook,
 * so the Invoicing page and the project workspace open exactly the same dialogs.
 *   const billing = useBillingActions()
 *   billing.run(project, "uploadInvoice")
 *   return <>{…}{billing.dialogs}</>
 */
export function useBillingActions() {
  const billing = useBilling()
  const canEdit = usePermission("billing", "edit")
  const canPrice = usePermission("pricing", "edit")
  const [priceFor, setPriceFor] = useState<ProjectRow | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<BillingRow | null>(null)
  const [payFor, setPayFor] = useState<BillingRow | null>(null)
  const [mailFor, setMailFor] = useState<{ row: BillingRow; kind: "Reminder" | "Follow-up" } | null>(null)
  const sendMail = useSendPaymentEmail()
  const byId = useMemo(() => new Map((billing.data ?? []).map((r) => [r.projectId, r])), [billing.data])

  const run = useCallback((p: ProjectRow, key: BillingNextKey) => {
    if (key === "setPrice") { if (canPrice) setPriceFor(p); return }
    const r = byId.get(p.id)
    if (!canEdit || !r) return
    if (key === "uploadInvoice") setInvoiceFor(r)
    else if (key === "remind") setMailFor({ row: r, kind: "Reminder" })
    else if (key === "followUp") setMailFor({ row: r, kind: "Follow-up" })
    else if (key === "confirmPayment") setPayFor(r)
  }, [byId, canEdit, canPrice])

  const dialogs = (
    <>
      {priceFor && <PricingForProject p={priceFor} onClose={() => setPriceFor(null)} />}
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
    </>
  )
  return { run, dialogs, ready: !billing.isPending, canEdit, canPrice, billingById: byId }
}

/** Pricing dialog opened from a list: loads the project's available inspectors so their rates show, as in the project overlay. */
function PricingForProject({ p, onClose }: { p: ProjectRow; onClose: () => void }) {
  const candidates = useCandidates(p.id)
  if (candidates.isPending) return null
  const inspectors = (candidates.data ?? []).filter((c) => c.availability === "Available").map((c) => c.inspector)
  return <PricingPanel p={p} inspectors={inspectors} dialogOnly open onOpenChange={(o) => !o && onClose()} />
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
  const pos = usePOs()
  const po = row ? (pos.data ?? []).find((x) => x.projectId === row.projectId) : undefined
  const poReceived = !!po && po.status !== "Awaiting PO" && !!po.poNumber
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
    form.reset({ number: "", date: today, jobName: `${row.title} (${row.code})`, amount: row.priceTotal, taxAmount: Math.round((row.priceTotal * gst) / 100), currency: row.currency, dueDate: addDays(today, row.paymentTermsDays), notes: poReceived ? `Against client PO ${po!.poNumber}` : "" })
    setFile([]); setFileError(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, form, settings.data, poReceived])
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
          <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", !poReceived ? "border-warning/40 bg-warning-soft/50" : po!.amount !== row?.priceTotal ? "border-warning/40 bg-warning-soft/50" : "bg-muted/50")}>
            <ReceiptText className="mt-0.5 size-4 shrink-0 text-primary-dark" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium">{poReceived ? <>Client PO {po!.poNumber} · {formatMoney(po!.amount, po!.currency)}</> : po ? "Client PO not received yet" : "No PO record for this job"}</p>
              <p className="text-xs text-muted-foreground">
                {!poReceived ? "You can still record the invoice. Check with the client whether their PO is needed on it."
                  : po!.amount !== row?.priceTotal ? `PO amount differs from the client price (${formatMoney(row?.priceTotal ?? 0, row?.currency ?? "INR")}).`
                    : "Matches the client price. The PO moves to Invoiced when you save."}
              </p>
            </div>
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
