import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Link } from "react-router-dom"
import { Bell, Plus, Trash2 } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { ComboboxField, DateField, FormGrid, SelectField, TextField } from "@/components/forms/fields"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { formatDate, relativeDay, todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/store/session.store"
import { useProjects } from "@/features/projects/hooks"
import { useLookupOptions } from "@/features/settings/lookups"
import type { ReminderRow } from "@/services"
import type { ReminderType } from "@/types/domain"
import { useCreateReminder, useDeleteReminder, useReminders, useSetReminderStatus } from "./hooks"

const TYPES: ReminderType[] = ["Inspector", "Job", "Job Date", "Report", "Payment"]
const NONE = ""

const schema = z.object({
  type: z.enum(["Inspector", "Job", "Job Date", "Report", "Payment"]),
  title: z.string().trim().min(4, "Describe what needs to happen"),
  projectId: z.string(),
  inspectorId: z.string(),
  dueDate: z.string({ error: "Due date is required" }).min(1, "Due date is required"),
  assigneeId: z.string().min(1, "Assign someone"),
})
type Values = z.infer<typeof schema>

export function RemindersPage() {
  const me = useCurrentUser()
  const q = useReminders()
  const canCreate = usePermission("reminders", "create")
  const canEdit = usePermission("reminders", "edit")
  const canDelete = usePermission("reminders", "delete")
  const setStatus = useSetReminderStatus()
  const del = useDeleteReminder()
  const [type, setType] = useState(ALL)
  const [mine, setMine] = useState(me.role === "Coordinator")
  const [showDone, setShowDone] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<ReminderRow | null>(null)

  const today = todayISO()
  const groups = useMemo(() => {
    const list = (q.data ?? []).filter((r) => (type === ALL || r.type === type) && (!mine || r.assigneeId === me.id))
    const open = list.filter((r) => r.status === "Open")
    return [
      { key: "overdue", label: "Overdue", items: open.filter((r) => r.dueDate < today) },
      { key: "today", label: "Due today", items: open.filter((r) => r.dueDate === today) },
      { key: "upcoming", label: "Upcoming", items: open.filter((r) => r.dueDate > today) },
      ...(showDone ? [{ key: "done", label: "Done", items: list.filter((r) => r.status === "Done") }] : []),
    ]
  }, [q.data, type, mine, me.id, today, showDone])
  const total = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <PageContainer>
      <PageHeader title="Reminders" description="Follow-ups for inspectors, jobs, job dates, reports and payments." actions={canCreate && <Button onClick={() => setCreating(true)}><Plus /> New reminder</Button>} />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <FilterBar><FilterSelect label="Type" value={type} onChange={setType} options={TYPES} allLabel="All reminder types" className="sm:w-52" /></FilterBar>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2"><Switch id="mine" checked={mine} onCheckedChange={setMine} /><Label htmlFor="mine" className="font-normal">Assigned to me</Label></div>
            <div className="flex items-center gap-2"><Switch id="done" checked={showDone} onCheckedChange={setShowDone} /><Label htmlFor="done" className="font-normal">Show done</Label></div>
          </div>
        </div>
        {q.isPending ? <TableSkeleton rows={5} columns={3} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : total === 0 ? (
          <EmptyState icon={Bell} title="No reminders" description={mine ? "Nothing assigned to you. Turn off “Assigned to me” to see everyone's." : "Create a reminder so follow-ups are not missed."} action={canCreate && <Button variant="outline" onClick={() => setCreating(true)}><Plus /> New reminder</Button>} />
        ) : (
          <div className="divide-y">
            {groups.filter((g) => g.items.length).map((g) => (
              <section key={g.key} aria-labelledby={`g-${g.key}`}>
                <h2 id={`g-${g.key}`} className={cn("bg-muted/60 px-4 py-2 text-xs font-semibold tracking-wide uppercase", g.key === "overdue" ? "text-danger" : "text-muted-foreground")}>{g.label} · {g.items.length}</h2>
                <ul className="divide-y">
                  {g.items.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                      <Checkbox className="mt-0.5" checked={r.status === "Done"} disabled={!canEdit || setStatus.isPending} onCheckedChange={(v) => setStatus.mutate({ id: r.id, status: v ? "Done" : "Open" })} aria-label={`Mark "${r.title}" as ${r.status === "Done" ? "open" : "done"}`} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className={cn("text-sm font-medium", r.status === "Done" && "text-muted-foreground line-through")}>{r.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <StatusBadge status={r.type} tone="info" dot={false} />
                          <span className={cn(g.key === "overdue" && "font-medium text-danger")}>{formatDate(r.dueDate)} · {relativeDay(r.dueDate)}</span>
                          {r.projectCode && <Link to={`/projects/${r.projectId}`} className="text-primary-text hover:underline">{r.projectCode}</Link>}
                          {r.inspectorName && <Link to={`/inspectors/${r.inspectorId}`} className="text-primary-text hover:underline">{r.inspectorName}</Link>}
                          <span>Assigned to {r.assigneeName}</span>
                        </div>
                      </div>
                      {canDelete && <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setToDelete(r)} aria-label={`Delete reminder ${r.title}`}><Trash2 /></Button>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
      {creating && <CreateReminderDialog onClose={() => setCreating(false)} />}
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title="Delete reminder?" description={toDelete?.title} confirmLabel="Delete" destructive loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })} />
    </PageContainer>
  )
}

function CreateReminderDialog({ onClose }: { onClose: () => void }) {
  const me = useCurrentUser()
  const create = useCreateReminder()
  const { userOptions, inspectorOptions } = useLookupOptions()
  const projects = useProjects()
  const projectOptions = useMemo(() => (projects.data ?? []).filter((p) => p.stage !== "Cancelled").map((p) => ({ value: p.id, label: `${p.code} · ${p.title}` })), [projects.data])
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { type: "Job", title: "", projectId: NONE, inspectorId: NONE, dueDate: "", assigneeId: me.id } })
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title="New reminder" formId="reminder-form" submitLabel="Create reminder" loading={create.isPending}>
      <Form {...form}>
        <form id="reminder-form" noValidate className="space-y-4" onSubmit={form.handleSubmit((v) => create.mutate({ ...v, projectId: v.projectId || null, inspectorId: v.inspectorId || null }, { onSuccess: onClose }))}>
          <FormGrid>
            <SelectField control={form.control} name="type" label="Type" required options={TYPES} />
            <DateField control={form.control} name="dueDate" label="Due date" required />
          </FormGrid>
          <TextField control={form.control} name="title" label="Reminder" required placeholder="e.g. Chase inspector for travel confirmation" />
          <ComboboxField control={form.control} name="projectId" label="Project" options={projectOptions} placeholder="Optional" />
          <ComboboxField control={form.control} name="inspectorId" label="Inspector" options={inspectorOptions} placeholder="Optional" />
          <SelectField control={form.control} name="assigneeId" label="Assign to" required options={userOptions} />
        </form>
      </Form>
    </FormDialog>
  )
}
