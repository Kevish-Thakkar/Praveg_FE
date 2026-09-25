import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BadgeIndianRupee, BellRing, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FormGrid, NumberField, SelectField, TextareaField } from "@/components/forms/fields"
import { Money } from "@/components/common/Money"
import { usePermission } from "@/components/common/Can"
import { useLookupOptions } from "@/features/settings/lookups"
import { formatDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import { pricingTotal, unitLabel } from "@/lib/workflow"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"
import type { Inspector } from "@/types/domain"
import { useRequestPricing, useSetPricing } from "../../hooks"

const schema = z.object({
  rateBasis: z.enum(["Man-Day", "Lump Sum", "Hourly"]),
  units: z.number({ error: "Enter the quantity" }).positive("Must be more than 0"),
  clientRate: z.number({ error: "Enter the client rate" }).positive("Must be more than 0"),
  currency: z.string().min(1),
  notes: z.string().max(500),
})
type Values = z.infer<typeof schema>

/**
 * The rate sent to the client is decided per job by Super Admin / Accountant.
 * Coordinators see it (needed for the CV email) and can request it.
 */
export function PricingPanel({ p, inspectors, autoOpen, dialogOnly, open: openProp, onOpenChange }: { p: ProjectRow; inspectors: Inspector[]; autoOpen?: boolean; dialogOnly?: boolean; open?: boolean; onOpenChange?: (o: boolean) => void }) {
  const canSet = usePermission("pricing", "edit")
  const { currencyOptions, clients } = useLookupOptions()
  const request = useRequestPricing()
  const save = useSetPricing()
  const [openState, setOpenState] = useState(false)
  const open = dialogOnly ? !!openProp : openState
  const setOpen = (o: boolean) => (dialogOnly ? onOpenChange?.(o) : setOpenState(o))
  const form = useForm<Values>({ resolver: zodResolver(schema) })
  const basis = useWatch({ control: form.control, name: "rateBasis" })
  const [rate, units, cur] = useWatch({ control: form.control, name: ["clientRate", "units", "currency"] })

  const openForm = () => {
    const clientCurrency = clients.find((c) => c.id === p.clientId)?.currency ?? "INR"
    form.reset(p.pricing ? { ...p.pricing } : { rateBasis: "Man-Day", units: Math.max(1, p.schedule?.dates.length ?? 1), clientRate: undefined as unknown as number, currency: clientCurrency, notes: "" })
    setOpen(true)
  }
  // dialog-only mode (Invoicing page): reset the form each time the parent opens it
  useEffect(() => {
    if (dialogOnly && openProp) openForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOnly, openProp])
  useEffect(() => {
    if (autoOpen && canSet) openForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, canSet])

  // reference: what the shortlisted inspectors charge (cost side)
  const refRates = inspectors.map((i) => ({ name: i.name, rate: basis === "Lump Sum" ? i.lumpSumRate : basis === "Hourly" ? i.hourlyRate : i.manDayRate, currency: i.currency }))
  const total = basis === "Lump Sum" ? rate || 0 : (rate || 0) * (units || 0)

  const dialog = (
      <FormDialog open={open} onOpenChange={setOpen} title={`Client price — ${p.code}`} description="Decided per job. It is included in the CV email to the client." formId="pricing-form" submitLabel="Save price" loading={save.isPending}>
        <Form {...form}>
          <form id="pricing-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate({ projectId: p.id, pricing: v }, { onSuccess: () => setOpen(false) }))}>
            <FormGrid>
              <SelectField control={form.control} name="rateBasis" label="Rate basis" required options={["Man-Day", "Lump Sum", "Hourly"]} />
              <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
              <NumberField control={form.control} name="clientRate" label={basis === "Lump Sum" ? "Lump sum amount" : `Rate per ${basis === "Hourly" ? "hour" : "man-day"}`} required prefix={cur} />
              {basis !== "Lump Sum" && <NumberField control={form.control} name="units" label={basis === "Hourly" ? "Hours" : "Man-days"} required step="0.5" />}
            </FormGrid>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"><span className="text-muted-foreground">Total to client (excl. tax)</span><span className="font-semibold tabular-nums">{formatMoney(total, cur || "INR")}</span></div>
            {refRates.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Inspector cost reference ({basis === "Lump Sum" ? "lump sum" : basis === "Hourly" ? "per hour" : "per man-day"})</p>
                <ul className="divide-y rounded-lg border text-xs">{refRates.map((r) => <li key={r.name} className="flex justify-between px-3 py-1.5"><span>{r.name}</span><Money amount={r.rate} currency={r.currency} /></li>)}</ul>
              </div>
            )}
            <TextareaField control={form.control} name="notes" label="Notes" rows={2} placeholder="e.g. Travel & stay extra at actuals" />
          </form>
        </Form>
      </FormDialog>
  )
  if (dialogOnly) return dialog

  return (
    <div id="step-pricing" className={cn("scroll-mt-24 rounded-xl border p-4", p.pricing ? "bg-success-soft/40" : "bg-warning-soft/40")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", p.pricing ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}><BadgeIndianRupee className="size-5" aria-hidden /></span>
          <div>
            <p className="text-sm font-semibold">Client price</p>
            {p.pricing ? (
              <p className="text-sm">
                <Money amount={pricingTotal(p)} currency={p.pricing.currency} className="font-semibold" />
                <span className="text-muted-foreground"> · {p.pricing.rateBasis === "Lump Sum" ? "Lump sum" : `${formatMoney(p.pricing.clientRate, p.pricing.currency)} × ${unitLabel(p.pricing.rateBasis, p.pricing.units)}`}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{p.pricingRequestedAt ? `Requested from Accounts ${formatDateTime(p.pricingRequestedAt)}` : "Not set — CVs can't be sent to the client until Accounts sets the price."}</p>
            )}
            {p.pricing?.notes && <p className="text-xs text-muted-foreground">{p.pricing.notes}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {canSet ? (
            <Button size="sm" variant={p.pricing ? "outline" : "default"} onClick={openForm}>{p.pricing ? <><Pencil /> Change price</> : "Set client price"}</Button>
          ) : !p.pricing ? (
            <Button size="sm" variant="outline" disabled={request.isPending} onClick={() => request.mutate(p.id)}><BellRing /> {p.pricingRequestedAt ? "Remind Accounts" : "Request price"}</Button>
          ) : null}
        </div>
      </div>

      {dialog}
    </div>
  )
}
