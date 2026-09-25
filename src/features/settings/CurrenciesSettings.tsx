import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { SectionHeader } from "@/components/common/SectionHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { FormGrid, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import type { Currency } from "@/types/domain"
import { useAddCurrency, useCurrencies, useRemoveCurrency } from "./hooks"

const schema = z.object({
  code: z.string().trim().regex(/^[A-Z]{3}$/, "Use the 3-letter ISO code, e.g. USD"),
  name: z.string().trim().min(3, "Name is required"),
  symbol: z.string().trim().min(1, "Symbol is required").max(4),
})
type V = z.infer<typeof schema>

export function CurrenciesSettings() {
  const q = useCurrencies()
  const add = useAddCurrency()
  const remove = useRemoveCurrency()
  const canEdit = usePermission("settings", "edit")
  const [open, setOpen] = useState(false)
  const [toRemove, setToRemove] = useState<Currency | null>(null)
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: { code: "", name: "", symbol: "" } })
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b p-4"><SectionHeader title="Currencies" description="Used by clients, inspector rates, quotations, POs and invoices." actions={canEdit && <Button size="sm" onClick={() => { form.reset(); setOpen(true) }}><Plus /> Add currency</Button>} /></div>
      {q.isPending ? <TableSkeleton rows={4} columns={3} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
        <ul className="divide-y">
          {q.data.map((c) => (
            <li key={c.code} className="flex items-center gap-4 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-md bg-muted text-sm font-semibold">{c.symbol}</span>
              <div className="min-w-0 flex-1"><p className="font-medium">{c.code}</p><p className="text-xs text-muted-foreground">{c.name}</p></div>
              {c.isBase && <StatusBadge status="Base currency" tone="info" dot={false} />}
              {canEdit && !c.isBase && <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setToRemove(c)} aria-label={`Remove ${c.code}`}><Trash2 /></Button>}
            </li>
          ))}
        </ul>
      )}
      <FormDialog open={open} onOpenChange={setOpen} title="Add currency" formId="cur-form" loading={add.isPending}>
        <Form {...form}>
          <form id="cur-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => add.mutate({ ...v, isBase: false }, { onSuccess: () => setOpen(false) }))}>
            <FormGrid><TextField control={form.control} name="code" label="ISO code" required /><TextField control={form.control} name="symbol" label="Symbol" required /></FormGrid>
            <TextField control={form.control} name="name" label="Name" required />
          </form>
        </Form>
      </FormDialog>
      <ConfirmDialog open={!!toRemove} onOpenChange={(o) => !o && setToRemove(null)} title={`Remove ${toRemove?.code}?`} description="Existing records keep their currency; it won't be offered for new ones." confirmLabel="Remove" destructive loading={remove.isPending} onConfirm={() => toRemove && remove.mutate(toRemove.code, { onSuccess: () => setToRemove(null) })} />
    </Card>
  )
}
