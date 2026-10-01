import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { Pencil, Plus, Trash2, Truck, UserRound } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DescriptionList } from "@/components/common/DescriptionList"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { SelectField, TextField } from "@/components/forms/fields"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { DocumentsPanel } from "@/features/documents/components/DocumentsPanel"
import { useProjects } from "@/features/projects/hooks"
import { useSaveVendor, useVendors } from "@/features/vendors/hooks"
import { MapPreview } from "@/components/forms/address"
import { StageTrack } from "@/components/common/StageTrack"
import { formatAddress } from "@/constants/geo"
import type { ClientContact } from "@/types/domain"
import { useClient, useDeleteClient, useRemoveContact, useSaveClient, useSaveContact } from "./hooks"
import { ClientFormDrawer, VendorFormDrawer } from "./components/ClientFormDrawer"

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  jobDescription: z.string().trim().min(2, "Job description is required"),
  recipientRole: z.enum(["To", "CC", "BCC"]),
})
type ContactValues = z.infer<typeof contactSchema>

export function ClientDetailPage() {
  const { clientId = "" } = useParams()
  const navigate = useNavigate()
  const q = useClient(clientId)
  const projects = useProjects()
  const vendors = useVendors(clientId)
  const saveVendor = useSaveVendor()
  const [vendorOpen, setVendorOpen] = useState(false)
  const save = useSaveClient()
  const del = useDeleteClient()
  const saveContact = useSaveContact(clientId)
  const removeContact = useRemoveContact(clientId)
  const canEdit = usePermission("clients", "edit")
  const canDelete = usePermission("clients", "delete")
  const [editing, setEditing] = useState(false)
  const [contact, setContact] = useState<ClientContact | "new" | null>(null)
  const [removing, setRemoving] = useState<ClientContact | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const form = useForm<ContactValues>({ resolver: zodResolver(contactSchema) })

  const openContact = (c: ClientContact | "new") => {
    form.reset(c === "new" ? { name: "", email: "", jobDescription: "", recipientRole: "CC" } : c)
    setContact(c)
  }

  const contactColumns = useMemo<Column<ClientContact>[]>(() => [
    { id: "name", header: "Contact", sortValue: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></div> },
    { id: "job", header: "Job description", hideBelow: "md", cell: (c) => c.jobDescription },
    { id: "role", header: "Email as", cell: (c) => <StatusBadge status={c.recipientRole} tone={c.recipientRole === "To" ? "info" : "neutral"} dot={false} /> },
    { id: "a", header: "", className: "w-12", cell: (c) => <ActionMenu items={[{ label: "Edit contact", icon: Pencil, hidden: !canEdit, onSelect: () => openContact(c) }, { label: "Remove", icon: Trash2, destructive: true, hidden: !canEdit, onSelect: () => setRemoving(c) }]} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canEdit])

  if (q.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (q.isError) return <PageContainer><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></PageContainer>
  const c = q.data
  const clientProjects = (projects.data ?? []).filter((p) => p.clientId === c.id)

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Clients", to: "/clients" }, { label: c.name }]}
        backTo={{ to: "/clients", label: "clients" }}
        title={c.name}
        meta={<><span>{c.address.city}, {c.address.state}</span><span aria-hidden>·</span><span>{c.currency}</span><span aria-hidden>·</span><span>{c.paymentTermsDays}-day payment terms</span></>}
        actions={<>
          {canEdit && <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>}
          <ActionMenu items={[{ label: "Delete client", icon: Trash2, destructive: true, hidden: !canDelete, onSelect: () => setConfirmDelete(true) }]} />
        </>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Client details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DescriptionList columns={1} items={[
              { label: "Email", value: c.email }, { label: "Mobile", value: c.mobile || "—" }, { label: "Address", value: formatAddress(c.address) },
              { label: "Billing", value: `${c.currency} · payment due ${c.paymentTermsDays} days after invoice` },
            ]} />
            <MapPreview address={c.address} height="h-36" />
          </CardContent>
        </Card>
        <Card className="gap-0 overflow-hidden pb-0 lg:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle>Contact manager</CardTitle>
            <CardDescription>“Email as” sets whether a contact is added to To, CC or BCC by default on client emails.</CardDescription>
            {canEdit && <CardAction><Button size="sm" onClick={() => openContact("new")}><Plus /> Add contact</Button></CardAction>}
          </CardHeader>
          <DataTable rows={c.contacts} columns={contactColumns} getRowId={(x) => x.id} caption="Client contacts"
            empty={<EmptyState compact icon={UserRound} title="No contacts yet" description="Add at least one “To” contact so CVs, completion and payment emails have a recipient." action={canEdit && <Button size="sm" variant="outline" onClick={() => openContact("new")}><Plus /> Add contact</Button>} />}
          />
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 overflow-hidden pb-0">
          <CardHeader className="border-b pb-4">
            <CardTitle>Vendors</CardTitle>
            <CardDescription>The client's suppliers / manufacturers where jobs take place</CardDescription>
            {canEdit && <CardAction><Button size="sm" variant="outline" onClick={() => setVendorOpen(true)}><Plus /> Add vendor</Button></CardAction>}
          </CardHeader>
          {(vendors.data ?? []).length === 0 ? <EmptyState compact icon={Truck} title="No vendors yet" description="Add the vendors of this client so projects can refer to them." /> : (
            <ul className="divide-y">{(vendors.data ?? []).map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-6 py-3"><span className="min-w-0"><span className="block truncate text-sm font-medium">{v.name}</span><span className="block truncate text-xs text-muted-foreground">{v.address.city}, {v.address.state} · {v.email}</span></span><span className="shrink-0 text-xs text-muted-foreground tabular-nums">{v.projectCount} job(s)</span></li>
            ))}</ul>
          )}
        </Card>
        <Card className="gap-0 overflow-hidden pb-0">
          <CardHeader className="border-b pb-4"><CardTitle>Projects</CardTitle><CardDescription>{clientProjects.length} job(s) for this client</CardDescription></CardHeader>
          {clientProjects.length === 0 ? <EmptyState compact title="No projects yet" /> : (
            <ul className="divide-y">{clientProjects.map((p) => (
              <li key={p.id}><button type="button" onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full items-center justify-between gap-3 px-6 py-3 text-left hover:bg-muted/60"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.title}</span><span className="block truncate text-xs text-muted-foreground">{p.code} · {p.insight.checkpoint}</span></span><StageTrack stage={p.stage} className="hidden sm:flex" /></button></li>
            ))}</ul>
          )}
        </Card>
      </div>
      <DocumentsPanel entityType="Client" entityId={c.id} categories={["Other", "Technical Document", "Template"]} title="Client documents" description="Framework agreements, client specifications and templates." />

      <ClientFormDrawer open={editing} onOpenChange={setEditing} initial={c} saving={save.isPending} onSubmit={(v) => save.mutate({ id: c.id, input: v }, { onSuccess: () => setEditing(false) })} />
      <VendorFormDrawer open={vendorOpen} onOpenChange={setVendorOpen} defaultClientId={c.id} saving={saveVendor.isPending} onSubmit={(v) => saveVendor.mutate({ input: v }, { onSuccess: () => setVendorOpen(false) })} />
      <FormDialog open={!!contact} onOpenChange={(o) => !o && setContact(null)} title={contact === "new" ? "Add contact" : "Edit contact"} formId="contact-form" loading={saveContact.isPending}>
        <Form {...form}>
          <form id="contact-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => saveContact.mutate({ ...v, id: contact !== "new" && contact ? contact.id : undefined }, { onSuccess: () => setContact(null) }))}>
            <TextField control={form.control} name="name" label="Contact name" required />
            <TextField control={form.control} name="email" label="Email address" required type="email" />
            <TextField control={form.control} name="jobDescription" label="Job description" required placeholder="e.g. QA/QC Manager" />
            <SelectField control={form.control} name="recipientRole" label="Default email recipient type" required options={[{ value: "To", label: "To" }, { value: "CC", label: "CC" }, { value: "BCC", label: "BCC" }]} />
          </form>
        </Form>
      </FormDialog>
      <ConfirmDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)} title="Remove contact?" description={`${removing?.name} will no longer be suggested on client emails.`} confirmLabel="Remove" destructive loading={removeContact.isPending} onConfirm={() => removing && removeContact.mutate(removing.id, { onSuccess: () => setRemoving(null) })} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${c.name}?`} description="Clients with projects cannot be deleted. Deleting a client also deletes its vendors." confirmLabel="Delete client" destructive loading={del.isPending} onConfirm={() => del.mutate(c.id, { onSuccess: () => navigate("/clients") })} />
    </PageContainer>
  )
}
