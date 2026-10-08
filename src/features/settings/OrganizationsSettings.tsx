import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { SectionHeader } from "@/components/common/SectionHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FormGrid, SelectField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { COUNTRIES } from "@/constants/geo"
import type { Organization } from "@/types/domain"
import { useOrganizations, useSaveOrganization } from "./hooks"

const schema = z.object({
  name: z.string().trim().min(3, "Name is required"),
  code: z.string().trim().min(2, "Code is required").max(10).regex(/^[A-Z0-9-]+$/, "Use capitals, digits and hyphens"),
  emailDomain: z.string().trim().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter a domain like praveg.com"),
  country: z.enum(["India", "United Arab Emirates"], { message: "Select a country" }),
  city: z.string().trim().min(2, "City is required"),
  status: z.enum(["Active", "Inactive"]),
})
type V = z.infer<typeof schema>

export function OrganizationsSettings() {
  const q = useOrganizations()
  const save = useSaveOrganization()
  const canEdit = usePermission("organizations", "edit")
  const [editing, setEditing] = useState<Organization | "new" | null>(null)
  const form = useForm<V>({ resolver: zodResolver(schema) })
  const open = (o: Organization | "new") => { form.reset(o === "new" ? { name: "", code: "", emailDomain: "praveg.com", country: "India", city: "", status: "Active" } : o); setEditing(o) }
  const columns = useMemo<Column<Organization>[]>(() => [
    { id: "name", header: "Organization", sortValue: (o) => o.name, cell: (o) => <div><p className="font-medium">{o.name}</p><p className="text-xs text-muted-foreground">{o.code}</p></div> },
    { id: "loc", header: "Location", hideBelow: "md", cell: (o) => `${o.city}, ${o.country}` },
    { id: "domain", header: "Email domain", hideBelow: "sm", cell: (o) => o.emailDomain },
    { id: "status", header: "Status", cell: (o) => <StatusBadge status={o.status} /> },
    { id: "a", header: "", className: "w-12", cell: (o) => canEdit && <Button variant="ghost" size="icon" className="size-8" onClick={() => open(o)} aria-label={`Edit ${o.name}`}><Pencil /></Button> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canEdit])
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b p-4"><SectionHeader title="Organizations" description="Operating entities. Clients, vendors, inspectors and users belong to an organization." actions={false && <Button size="sm" onClick={() => open("new")}><Plus /> Add organization</Button>} /></div>
      {/* <div className="border-b p-4"><SectionHeader title="Organizations" description="Operating entities. Clients, vendors, inspectors and users belong to an organization." actions={canEdit && <Button size="sm" onClick={() => open("new")}><Plus /> Add organization</Button>} /></div> */}
      {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : <DataTable rows={q.data ?? []} columns={columns} getRowId={(o) => o.id} loading={q.isPending} caption="Organizations" empty={null} />}
      {!canEdit && <p className="border-t px-4 py-3 text-xs text-muted-foreground">Only Super Admins can add or edit organizations.</p>}
      <FormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? "Add organization" : "Edit organization"} formId="org-form" loading={save.isPending}>
        <Form {...form}>
          <form id="org-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate({ id: editing !== "new" && editing ? editing.id : undefined, input: v }, { onSuccess: () => setEditing(null) }))}>
            <TextField control={form.control} name="name" label="Name" required />
            <FormGrid>
              <TextField control={form.control} name="code" label="Code" required placeholder="PCS-IN" />
              <TextField control={form.control} name="emailDomain" label="Email domain" required />
              <SelectField control={form.control} name="country" label="Country" required options={COUNTRIES} />
              <TextField control={form.control} name="city" label="City" required />
              <SelectField control={form.control} name="status" label="Status" required options={["Active", "Inactive"]} />
            </FormGrid>
          </form>
        </Form>
      </FormDialog>
    </Card>
  )
}
