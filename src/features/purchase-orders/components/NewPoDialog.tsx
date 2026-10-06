import { useEffect, useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ComboboxField } from "@/components/forms/fields"
import { useProjects } from "@/features/projects/hooks"
import type { PORow, ProjectRow } from "@/services"
import { newPoFor } from "../po-utils"

/** Step 1 of "New PO": pick a project that has no PO record yet; the PO dialog then opens prefilled from its client price. */
export function NewPoDialog({ open, onOpenChange, existing, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; existing: PORow[]; onPick: (po: PORow) => void }) {
  const projects = useProjects()
  const form = useForm<{ projectId: string }>({ defaultValues: { projectId: "" } })
  const projectId = useWatch({ control: form.control, name: "projectId" })
  useEffect(() => { if (open) form.reset({ projectId: "" }) }, [open, form])

  const eligible = useMemo(() => {
    const has = new Set(existing.map((x) => x.projectId))
    return (projects.data ?? []).filter((p) => p.stage !== "Cancelled" && !has.has(p.id))
  }, [projects.data, existing])
  const options = eligible.map((p) => ({ value: p.id, label: `${p.code} · ${p.title}`, hint: `${p.clientName}${p.pricing ? "" : " · no client price yet"}` }))
  const picked: ProjectRow | undefined = eligible.find((p) => p.id === projectId)

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New purchase order"
      description="Choose the project the client's PO is for. Projects that already have a PO record are not listed — open that PO to update it."
      formId="new-po"
      submitLabel="Continue"
      submitDisabled={!picked}
    >
      <Form {...form}>
        <form id="new-po" className="space-y-3" onSubmit={form.handleSubmit(() => { if (picked) { onOpenChange(false); onPick(newPoFor(picked)) } })}>
          <ComboboxField control={form.control} name="projectId" label="Project" required options={options} searchPlaceholder="Search code, project or client…" emptyText="No project without a PO" />
          {picked && !picked.pricing && <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">No client price is set for this project, so the PO amount can't be checked yet. Enter the amount on the client's PO.</p>}
        </form>
      </Form>
    </FormDialog>
  )
}
