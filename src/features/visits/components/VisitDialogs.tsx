import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form } from "@/components/ui/form"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, FormGrid, NumberField, SelectField, TextareaField } from "@/components/forms/fields"
import { todayISO } from "@/lib/dates"
import type { ProjectRow, VisitRow } from "@/services"
import { useCompleteVisit, useScheduleVisit } from "@/features/execution/hooks"

const scheduleSchema = z.object({
  type: z.enum(["Inspection", "Follow-up", "Repair"]),
  date: z.string({ error: "Date is required" }).min(1, "Date is required"),
  notes: z.string().max(300),
})
type ScheduleValues = z.infer<typeof scheduleSchema>

export function ScheduleVisitDialog({ project, open, onOpenChange }: { project: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const schedule = useScheduleVisit()
  const form = useForm<ScheduleValues>({ resolver: zodResolver(scheduleSchema), defaultValues: { type: "Follow-up", date: "", notes: "" } })
  useEffect(() => {
    if (open) form.reset({ type: "Follow-up", date: "", notes: "" })
  }, [open, form])

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Schedule visit" description={`${project.code} · ${project.assignedInspectorName} · ${project.site.city}`} formId="schedule-visit" submitLabel="Schedule visit" loading={schedule.isPending}>
      <Form {...form}>
        <form id="schedule-visit" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => schedule.mutate({ ...v, projectId: project.id }, { onSuccess: () => onOpenChange(false) }))}>
          <FormGrid>
            <SelectField control={form.control} name="type" label="Visit type" required options={["Inspection", "Follow-up", "Repair"]} />
            <DateField control={form.control} name="date" label="Visit date" required />
          </FormGrid>
          <TextareaField control={form.control} name="notes" label="Notes" rows={2} placeholder="Scope of this visit" />
          <p className="text-xs text-muted-foreground">A reminder is created automatically and the visit appears on the calendar.</p>
        </form>
      </Form>
    </FormDialog>
  )
}

const completeSchema = z.object({
  unitsSpent: z.number({ error: "Required" }).positive("Must be greater than 0"),
  expenses: z.number({ error: "Enter 0 if none" }).min(0),
  notes: z.string().trim().min(3, "Add a short summary of the visit"),
})
type CompleteValues = z.infer<typeof completeSchema>

export function CompleteVisitDialog({ visit, onClose }: { visit: VisitRow | null; onClose: () => void }) {
  const complete = useCompleteVisit()
  const form = useForm<CompleteValues>({ resolver: zodResolver(completeSchema), defaultValues: { unitsSpent: 1, expenses: 0, notes: "" } })
  useEffect(() => {
    if (visit) form.reset({ unitsSpent: 1, expenses: 0, notes: visit.notes })
  }, [visit, form])
  const future = visit && visit.date > todayISO()
  return (
    <FormDialog open={!!visit} onOpenChange={(o) => !o && onClose()} title="Complete visit" description={visit ? `${visit.type} visit · ${visit.projectCode} · ${visit.inspectorName}` : undefined} formId="complete-visit" submitLabel="Mark completed" loading={complete.isPending}>
      <Form {...form}>
        <form id="complete-visit" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => visit && complete.mutate({ id: visit.id, data: v }, { onSuccess: onClose }))}>
          {future && <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">This visit is scheduled in the future. Only complete it if it has actually taken place.</p>}
          <FormGrid>
            <NumberField control={form.control} name="unitsSpent" label="Days / hours spent" required step="0.5" />
            <NumberField control={form.control} name="expenses" label="Expenses" required description="Travel, stay, per diem" />
          </FormGrid>
          <TextareaField control={form.control} name="notes" label="Visit summary" required rows={3} />
          <p className="text-xs text-muted-foreground">Days and expenses are recorded against the job for Accounts.</p>
        </form>
      </Form>
    </FormDialog>
  )
}
