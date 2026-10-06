import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MapPin, UserRound } from "@/components/icons"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { DateField, NumberField, SwitchField, TextareaField } from "@/components/forms/fields"
import { formatDate, todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ProjectRow, VisitRow } from "@/services"
import { useCompleteVisit, useRescheduleVisit, useScheduleVisit } from "@/features/execution/hooks"
import { VisitDateTile, VisitTypeBadge } from "./VisitBits"

const TYPES = [
  { value: "Inspection", hint: "Another job day" },
  { value: "Follow-up", hint: "Re-check or witness" },
  { value: "Repair", hint: "After a defect repair" },
] as const

const scheduleSchema = z.object({
  type: z.enum(["Inspection", "Follow-up", "Repair"]),
  date: z.string({ error: "Date is required" }).min(1, "Date is required"),
  notes: z.string().max(300),
})
type ScheduleValues = z.infer<typeof scheduleSchema>

/** Job context shown at the top of both visit dialogs. */
function VisitContext({ date, type, code, title, inspector, location }: { date?: string; type?: string; code: string; title: string; inspector: string; location: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
      {date ? <VisitDateTile date={date} /> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="truncate">{code} · {title}</span>
          {type && <VisitTypeBadge type={type} />}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" aria-hidden /> {inspector}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {location}</span>
        </p>
      </div>
    </div>
  )
}

export function ScheduleVisitDialog({ project, open, onOpenChange }: { project: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const schedule = useScheduleVisit()
  const form = useForm<ScheduleValues>({ resolver: zodResolver(scheduleSchema), defaultValues: { type: "Follow-up", date: "", notes: "" } })
  useEffect(() => {
    if (open) form.reset({ type: "Follow-up", date: "", notes: "" })
  }, [open, form])

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Schedule visit" formId="schedule-visit" submitLabel="Schedule visit" loading={schedule.isPending}>
      <Form {...form}>
        <form id="schedule-visit" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => schedule.mutate({ ...v, projectId: project.id }, { onSuccess: () => onOpenChange(false) }))}>
          <VisitContext code={project.code} title={project.title} inspector={project.assignedInspectorName ?? "—"} location={`${project.site.city}, ${project.site.state}`} />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <p className="text-sm font-medium">Visit type <span className="text-danger">*</span></p>
                <FormControl>
                  <div role="radiogroup" aria-label="Visit type" className="grid grid-cols-3 gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === t.value}
                        onClick={() => field.onChange(t.value)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          field.value === t.value ? "border-primary-strong bg-primary-light/50 ring-1 ring-primary-strong" : "hover:bg-muted/60",
                        )}
                      >
                        <span className="block text-sm font-medium">{t.value}</span>
                        <span className="block text-xs text-muted-foreground">{t.hint}</span>
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DateField control={form.control} name="date" label="Visit date" required />
          <TextareaField control={form.control} name="notes" label="Notes" rows={2} placeholder="Scope of this visit" />
          <p className="text-xs text-muted-foreground">A reminder is created and the visit appears on the calendar.</p>
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
  const unit = visit?.unitLabel ?? "Days"
  return (
    <FormDialog open={!!visit} onOpenChange={(o) => !o && onClose()} title="Complete visit" formId="complete-visit" submitLabel="Mark completed" loading={complete.isPending}>
      <Form {...form}>
        <form id="complete-visit" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => visit && complete.mutate({ id: visit.id, data: v }, { onSuccess: onClose }))}>
          {visit && <VisitContext date={visit.date} type={visit.type} code={visit.projectCode} title={visit.projectTitle} inspector={visit.inspectorName} location={visit.location} />}
          {future && <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">This visit is scheduled in the future. Complete it only if it has taken place.</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField control={form.control} name="unitsSpent" label={`${unit} spent`} required step="0.5" />
            <NumberField control={form.control} name="expenses" label="Expenses" required prefix={visit?.currency} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">Expenses: travel, stay and per diem. Enter 0 if none.</p>
          <TextareaField control={form.control} name="notes" label="Visit summary" required rows={3} placeholder="What was inspected, findings, anything pending" />
          <p className="text-xs text-muted-foreground">{unit} and expenses are recorded against the job for Accounts.</p>
        </form>
      </Form>
    </FormDialog>
  )
}

const rescheduleSchema = z.object({
  date: z.string({ error: "Pick the new date" }).min(1, "Pick the new date"),
  reason: z.string().trim().min(3, "Say why the visit is moving").max(300),
  notifyInspector: z.boolean(),
})
type RescheduleValues = z.infer<typeof rescheduleSchema>

/** Move an upcoming visit to another date. Job days also update the project's job dates and the automatic reminder. */
export function RescheduleVisitDialog({ visit, onClose }: { visit: VisitRow | null; onClose: () => void }) {
  const reschedule = useRescheduleVisit()
  const form = useForm<RescheduleValues>({ resolver: zodResolver(rescheduleSchema), defaultValues: { date: "", reason: "", notifyInspector: true } })
  useEffect(() => {
    if (visit) form.reset({ date: "", reason: "", notifyInspector: true })
  }, [visit, form])
  const newDate = useWatch({ control: form.control, name: "date" })
  const history = visit?.reschedules ?? []
  return (
    <FormDialog open={!!visit} onOpenChange={(o) => !o && onClose()} title="Reschedule visit" formId="reschedule-visit" submitLabel="Reschedule" loading={reschedule.isPending}>
      <Form {...form}>
        <form
          id="reschedule-visit"
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => {
            if (!visit) return
            if (v.date === visit.date) return form.setError("date", { message: "Pick a different date" })
            reschedule.mutate({ id: visit.id, input: v }, { onSuccess: onClose })
          })}
        >
          {visit && <VisitContext date={visit.date} type={visit.type} code={visit.projectCode} title={visit.projectTitle} inspector={visit.inspectorName} location={visit.location} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Current date</p>
              <p className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm">{formatDate(visit?.date)}</p>
            </div>
            <DateField control={form.control} name="date" label="New date" required min={todayISO()} />
          </div>
          <TextareaField control={form.control} name="reason" label="Reason" required rows={2} placeholder="e.g. Vendor not ready — hydrotest moved by client" />
          <SwitchField control={form.control} name="notifyInspector" label={`Email ${visit?.inspectorName ?? "the inspector"} about the new date`} />
          {visit?.type === "Inspection" && newDate && (
            <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info">This is a job day: the project's job dates and the automatic reminder email (the day before the first job day) are updated too.</p>
          )}
          {history.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">Earlier changes</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {history.map((h) => <li key={h.at}>{formatDate(h.from)} → {formatDate(h.to)} · {h.reason}</li>)}
              </ul>
            </div>
          )}
        </form>
      </Form>
    </FormDialog>
  )
}
