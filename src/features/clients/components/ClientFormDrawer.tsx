import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { ComboboxField, FormGrid, FormSection, NumberField, SelectField, TextField } from "@/components/forms/fields"
import { AddressFields, addressSchema, emptyAddress } from "@/components/forms/address"
import { Spinner } from "@/components/feedback/LoadingState"
import { useLookupOptions } from "@/features/settings/lookups"
import type { Client, Vendor } from "@/types/domain"

const phone = z.string().trim().regex(/^(\+?[\d\s()-]{7,20})?$/, "Enter a valid phone number")

/** Mandatory on every master form: name, address, email, state, city (state/city live in the address). */
export const clientSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Enter a valid email"),
  mobile: phone,
  currency: z.string().min(1, "Select the billing currency"),
  paymentTermsDays: z.number({ message: "Enter the payment terms" }).int().min(0).max(365),
  address: addressSchema,
})
export type ClientValues = z.infer<typeof clientSchema>

export const vendorSchema = z.object({
  clientId: z.string().min(1, "Select the client this vendor belongs to"),
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.email("Enter a valid email"),
  mobile: phone,
  address: addressSchema,
})
export type VendorValues = z.infer<typeof vendorSchema>

interface Common {
  open: boolean
  onOpenChange: (o: boolean) => void
  saving: boolean
}

function Footer({ formId, saving, editing, noun, onCancel }: { formId: string; saving: boolean; editing: boolean; noun: string; onCancel: () => void }) {
  return (
    <>
      <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button type="submit" form={formId} disabled={saving}>{saving && <Spinner />} {editing ? "Save changes" : `Add ${noun}`}</Button>
    </>
  )
}

export function ClientFormDrawer({ open, onOpenChange, saving, initial, onSubmit }: Common & { initial?: Client | null; onSubmit: (v: ClientValues) => void }) {
  const { currencyOptions } = useLookupOptions()
  const form = useForm<ClientValues>({ resolver: zodResolver(clientSchema) })
  useEffect(() => {
    if (open)
      form.reset({
        name: initial?.name ?? "", email: initial?.email ?? "", mobile: initial?.mobile ?? "", currency: initial?.currency ?? "INR",
        paymentTermsDays: initial?.paymentTermsDays ?? 30, address: initial?.address ?? emptyAddress(),
      })
  }, [open, initial, form])

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      size="lg"
      title={initial ? `Edit ${initial.name}` : "Add client"}
      description="Clients own projects and vendors. Add contacts after saving."
      footer={<Footer formId="client-form" saving={saving} editing={!!initial} noun="client" onCancel={() => onOpenChange(false)} />}
    >
      <Form {...form}>
        <form id="client-form" noValidate className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Company">
            <TextField control={form.control} name="name" label="Client name" required />
            <FormGrid className="gap-3">
              <TextField control={form.control} name="email" label="Email" required type="email" />
              <TextField control={form.control} name="mobile" label="Mobile number" type="tel" autoComplete="tel" />
            </FormGrid>
          </FormSection>
          <FormSection title="Billing" hint="Payment due date = invoice date + payment terms">
            <FormGrid className="gap-3">
              <SelectField control={form.control} name="currency" label="Billing currency" required options={currencyOptions} />
              <NumberField control={form.control} name="paymentTermsDays" label="Payment terms (days)" required step="1" />
            </FormGrid>
          </FormSection>
          <FormSection title="Address">
            <AddressFields control={form.control} setValue={form.setValue} name="address" compact />
          </FormSection>
        </form>
      </Form>
    </DetailDrawer>
  )
}

export function VendorFormDrawer({ open, onOpenChange, saving, initial, defaultClientId, onSubmit }: Common & { initial?: Vendor | null; defaultClientId?: string; onSubmit: (v: VendorValues) => void }) {
  const { clientOptions } = useLookupOptions()
  const form = useForm<VendorValues>({ resolver: zodResolver(vendorSchema) })
  useEffect(() => {
    if (open)
      form.reset({
        clientId: initial?.clientId ?? defaultClientId ?? "", name: initial?.name ?? "", email: initial?.email ?? "", mobile: initial?.mobile ?? "",
        address: initial?.address ?? emptyAddress(),
      })
  }, [open, initial, defaultClientId, form])

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !saving && onOpenChange(o)}
      size="lg"
      title={initial ? `Edit ${initial.name}` : "Add vendor"}
      description="A vendor is the client's supplier / manufacturer where the inspection takes place."
      footer={<Footer formId="vendor-form" saving={saving} editing={!!initial} noun="vendor" onCancel={() => onOpenChange(false)} />}
    >
      <Form {...form}>
        <form id="vendor-form" noValidate className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormSection title="Vendor">
            <FormGrid className="gap-3">
              <ComboboxField control={form.control} name="clientId" label="Client" required options={clientOptions} searchPlaceholder="Search clients…" disabled={!!defaultClientId && !initial} />
              <TextField control={form.control} name="name" label="Vendor name" required />
              <TextField control={form.control} name="email" label="Email" required type="email" />
              <TextField control={form.control} name="mobile" label="Mobile number" type="tel" autoComplete="tel" />
            </FormGrid>
          </FormSection>
          <FormSection title="Address" hint="Used as the default job site for projects at this vendor">
            <AddressFields control={form.control} setValue={form.setValue} name="address" compact />
          </FormSection>
        </form>
      </Form>
    </DetailDrawer>
  )
}
