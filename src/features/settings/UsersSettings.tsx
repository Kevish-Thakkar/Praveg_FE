import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, UserPlus } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { SectionHeader } from "@/components/common/SectionHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { UserAvatar } from "@/components/common/UserAvatar"
import { SearchInput } from "@/components/common/SearchInput"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FormGrid, SelectField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { formatDateTime } from "@/lib/dates"
import { useCurrentUser } from "@/store/session.store"
import { ROLES, type User } from "@/types/domain"
import { useLookupOptions } from "./lookups"
import { useInviteUser, useSettings, useUpdateUser, useUsers } from "./hooks"

export function UsersSettings() {
  const me = useCurrentUser()
  const q = useUsers()
  const settings = useSettings()
  const { orgOptions } = useLookupOptions()
  const canCreate = usePermission("users", "create")
  const canEdit = usePermission("users", "edit")
  const [search, setSearch] = useState("")
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const rows = useMemo(() => (q.data ?? []).filter((u) => `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.trim().toLowerCase())), [q.data, search])
  const columns = useMemo<Column<User>[]>(() => [
    { id: "name", header: "User", sortValue: (u) => u.name, cell: (u) => <div className="flex items-center gap-3"><UserAvatar name={u.name} /><div><p className="font-medium">{u.name}{u.id === me.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div> },
    { id: "role", header: "Role", sortValue: (u) => u.role, cell: (u) => u.role },
    { id: "org", header: "Organization", hideBelow: "xl", cell: (u) => orgOptions.find((o) => o.value === u.organizationId)?.label ?? "—" },
    { id: "last", header: "Last active", hideBelow: "lg", sortValue: (u) => u.lastActiveAt ?? "", cell: (u) => (u.lastActiveAt ? formatDateTime(u.lastActiveAt) : "Never") },
    { id: "status", header: "Status", cell: (u) => <StatusBadge status={u.status} /> },
    { id: "a", header: "", className: "w-12", cell: (u) => canEdit && u.id !== me.id && <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`}><Pencil /></Button> },
  ], [orgOptions, canEdit, me.id, me.role])
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="space-y-3 border-b p-4">
        <SectionHeader title="Users" description={`Users sign in with an emailed OTP. Super Admin accounts must use ${settings.data?.allowedAdminDomains.join(", ") ?? "an organization"} email addresses.`} actions={canCreate && <Button size="sm" onClick={() => setInviting(true)}><UserPlus /> Invite user</Button>} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search users" />
      </div>
      {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : <DataTable rows={rows} columns={columns} getRowId={(u) => u.id} loading={q.isPending} caption="Users" empty={null} />}
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
      {editing && <EditUserDialog user={editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number"),
  role: z.enum(["Super Admin", "Coordinator", "Accountant"]),
  organizationId: z.string().min(1, "Select an organization"),
})
type InviteValues = z.infer<typeof inviteSchema>

function InviteDialog({ onClose }: { onClose: () => void }) {
  const me = useCurrentUser()
  const invite = useInviteUser()
  const { orgOptions } = useLookupOptions()
  const roles = me.role === "Super Admin" ? ROLES : ROLES.filter((r) => r !== "Super Admin")
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { name: "", email: "", phone: "", role: "Coordinator", organizationId: me.organizationId } })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="Invite user" description="They'll receive an email to sign in with a one-time password." formId="invite-form" submitLabel="Send invitation" loading={invite.isPending}>
      <Form {...form}>
        <form id="invite-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => invite.mutate(v, { onSuccess: onClose }))}>
          <TextField control={form.control} name="name" label="Full name" required />
          <FormGrid>
            <TextField control={form.control} name="email" label="Email" required type="email" />
            <TextField control={form.control} name="phone" label="Phone" required type="tel" />
            <SelectField control={form.control} name="role" label="Role" required options={roles} />
            <SelectField control={form.control} name="organizationId" label="Organization" required options={orgOptions} />
          </FormGrid>
        </form>
      </Form>
    </FormDialog>
  )
}

const editSchema = z.object({ role: z.enum(["Super Admin", "Coordinator", "Accountant"]), status: z.enum(["Active", "Invited", "Disabled"]) })
type EditValues = z.infer<typeof editSchema>

function EditUserDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const me = useCurrentUser()
  const update = useUpdateUser()
  const roles = me.role === "Super Admin" ? ROLES : ROLES.filter((r) => r !== "Super Admin")
  const form = useForm<EditValues>({ resolver: zodResolver(editSchema), defaultValues: { role: user.role, status: user.status } })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={`Edit ${user.name}`} description={user.email} formId="edit-user" loading={update.isPending}>
      <Form {...form}>
        <form id="edit-user" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => update.mutate({ id: user.id, patch: v }, { onSuccess: onClose }))}>
          <SelectField control={form.control} name="role" label="Role" required options={roles} />
          <SelectField control={form.control} name="status" label="Status" required options={["Active", "Invited", "Disabled"]} description="Disabled users can't sign in; their history is kept." />
        </form>
      </Form>
    </FormDialog>
  )
}
