import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Plus, Trash2 } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { SectionHeader } from "@/components/common/SectionHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import type { ProjectType } from "@/types/domain"
import { useDeleteProjectType, useProjectTypes, useSaveProjectType } from "./hooks"

const schema = z.object({ name: z.string().trim().min(3, "Name is required"), category: z.enum(["Inspection", "Testing", "Other"]), description: z.string().max(200) })
type V = z.infer<typeof schema>

export function ProjectTypesSettings() {
  const q = useProjectTypes()
  const save = useSaveProjectType()
  const del = useDeleteProjectType()
  const canEdit = usePermission("settings", "edit")
  const [editing, setEditing] = useState<ProjectType | "new" | null>(null)
  const [toDelete, setToDelete] = useState<ProjectType | null>(null)
  const form = useForm<V>({ resolver: zodResolver(schema) })
  const open = (t: ProjectType | "new") => { form.reset(t === "new" ? { name: "", category: "Inspection", description: "" } : t); setEditing(t) }
  const columns = useMemo<Column<ProjectType>[]>(() => [
    { id: "name", header: "Project type", sortValue: (t) => t.name, cell: (t) => <div><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.description}</p></div> },
    { id: "cat", header: "Category", sortValue: (t) => t.category, cell: (t) => <StatusBadge status={t.category} tone={t.category === "Testing" ? "violet" : t.category === "Other" ? "neutral" : "info"} dot={false} /> },
    { id: "a", header: "", className: "w-12", cell: (t) => <ActionMenu items={[{ label: "Edit", icon: Pencil, hidden: !canEdit, onSelect: () => open(t) }, { label: "Delete", icon: Trash2, destructive: true, hidden: !canEdit, onSelect: () => setToDelete(t) }]} /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canEdit])
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b p-4"><SectionHeader title="Services" description="The services a client can request. Each belongs to Inspection, Testing or Other." actions={canEdit && <Button size="sm" onClick={() => open("new")}><Plus /> Add service</Button>} /></div>
      {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : <DataTable rows={q.data ?? []} columns={columns} getRowId={(t) => t.id} loading={q.isPending} caption="Project types" empty={null} />}
      <FormDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? "Add project type" : "Edit project type"} formId="pt-form" loading={save.isPending}>
        <Form {...form}>
          <form id="pt-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate({ id: editing !== "new" && editing ? editing.id : undefined, input: v }, { onSuccess: () => setEditing(null) }))}>
            <TextField control={form.control} name="name" label="Name" required />
            <SelectField control={form.control} name="category" label="Category" required options={["Inspection", "Testing", "Other"]} />
            <TextareaField control={form.control} name="description" label="Description" rows={2} />
          </form>
        </Form>
      </FormDialog>
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete ${toDelete?.name}?`} description="Types already used by projects cannot be deleted." confirmLabel="Delete" destructive loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })} />
    </Card>
  )
}
