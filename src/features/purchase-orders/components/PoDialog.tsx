import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form } from "@/components/ui/form"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, FormGrid, NumberField, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { useLookupOptions } from "@/features/settings/lookups"
import { useSavePO } from "@/features/execution/hooks"
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

/** Record or update the client's PO for a job. */
export function PoDialog({ po, onClose }: { po: PORow | null; onClose: () => void }) {
  const { currencyOptions } = useLookupOptions()
  const save = useSavePO()
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (po) form.reset({ poNumber: po.poNumber, issueDate: po.issueDate, amount: po.amount, currency: po.currency, status: po.status === "Awaiting PO" ? "Received" : po.status, notes: po.notes })
  }, [po, form])
  return (
    <FormDialog open={!!po} onOpenChange={(o) => !o && onClose()} title={po?.poNumber ? `PO ${po.poNumber}` : "Record client PO"} description={po ? `${po.projectCode} · ${po.clientName}` : ""} formId="po-form" loading={save.isPending}>
      <Form {...form}>
        <form id="po-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => po && save.mutate({ projectId: po.projectId, input: v }, { onSuccess: onClose }))}>
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
  )
}
