import { db, newId } from "@/mock/db"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { PurchaseOrder, Reminder, TimeEntry, Visit } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"
import { mailVisitRescheduled, queueJobReminder } from "./project.service"
import { formatDate, toISODate } from "@/lib/dates"

const proj = (id: string | null) => db.projects.find((p) => p.id === id)

/* ───────────── Purchase orders ───────────── */

export interface PORow extends PurchaseOrder {
  projectCode: string
  projectTitle: string
  clientName: string
}

const poRow = (p: PurchaseOrder): PORow => ({
  ...p,
  projectCode: proj(p.projectId)?.code ?? "—",
  projectTitle: proj(p.projectId)?.title ?? "",
  clientName: db.clients.find((c) => c.id === p.clientId)?.name ?? "—",
})

export type POInput = Pick<PurchaseOrder, "poNumber" | "amount" | "currency" | "issueDate" | "notes" | "status">

export const poService = {
  list: () => request<PORow[]>(() => db.purchaseOrders.map(poRow)),
  getByProject: (projectId: string) =>
    request<PORow | null>(() => {
      const p = db.purchaseOrders.find((x) => x.projectId === projectId)
      return p ? poRow(p) : null
    }),
  save: (projectId: string, input: POInput) =>
    request(() => {
      const p = proj(projectId) ?? notFound("Project")
      if (p.stage === "Cancelled") throw new ApiError("This project is cancelled", 409)
      if (input.poNumber && db.purchaseOrders.some((x) => x.poNumber === input.poNumber && x.projectId !== projectId)) {
        throw new ApiError(`PO number ${input.poNumber} is already used on another project`, 409)
      }
      // one PO record per project: created here (manually) or when the inspector is assigned
      let po = db.purchaseOrders.find((x) => x.projectId === projectId)
      const created = !po
      if (!po) {
        po = { id: newId("po"), projectId, clientId: p.clientId, ...input }
        db.purchaseOrders.unshift(po)
      } else Object.assign(po, input)
      logActivity("Purchase Order", po.id, projectId, `${created ? "Created" : "Recorded"} PO ${input.poNumber || "(pending)"} for ${p.code}`)
      return poRow(po)
    }, { mutate: true }),
}

/* ───────────── Visits (job days) ───────────── */

export interface VisitRow extends Visit {
  projectCode: string
  projectTitle: string
  clientName: string
  location: string
  inspectorName: string
  coordinatorId: string
  /** currency for expenses: client pricing currency, else the inspector's rate currency */
  currency: string
  /** what "units spent" means for this job */
  unitLabel: "Days" | "Hours"
}

export function toVisitRow(v: Visit): VisitRow {
  const p = proj(v.projectId)
  return {
    ...v,
    projectCode: p?.code ?? "—",
    projectTitle: p?.title ?? "",
    clientName: db.clients.find((c) => c.id === p?.clientId)?.name ?? "—",
    location: p ? `${p.site.city}, ${p.site.state}` : "—",
    inspectorName: db.inspectors.find((x) => x.id === v.inspectorId)?.name ?? "—",
    coordinatorId: p?.coordinatorId ?? "",
    currency: p?.pricing?.currency ?? db.inspectors.find((x) => x.id === v.inspectorId)?.currency ?? "USD",
    unitLabel: p?.pricing?.rateBasis === "Hourly" ? "Hours" : "Days",
  }
}

export type VisitInput = Pick<Visit, "projectId" | "type" | "date" | "notes">
export interface RescheduleInput { date: string; reason: string; notifyInspector: boolean }

/** the open calendar reminder created for a visit (matched by project + old date) */
const visitReminder = (v: Visit) => db.reminders.find((r) => r.projectId === v.projectId && r.type === "Job Date" && r.dueDate === v.date && r.status === "Open")

export const visitService = {
  list: (filter: { projectId?: string } = {}) =>
    request<VisitRow[]>(() => db.visits.filter((v) => !filter.projectId || v.projectId === filter.projectId).map(toVisitRow).sort((a, b) => a.date.localeCompare(b.date))),
  /** Extra follow-up / repair visits after the main job */
  schedule: (input: VisitInput) =>
    request(() => {
      const p = proj(input.projectId) ?? notFound("Project")
      if (!p.assignedInspectorId) throw new ApiError("Assign an inspector before scheduling visits", 409)
      const v: Visit = { ...input, inspectorId: p.assignedInspectorId, id: newId("vis"), status: "Upcoming", unitsSpent: null, expenses: null, completedAt: null }
      db.visits.push(v)
      db.reminders.push({ id: newId("rem"), type: "Job Date", title: `${input.type} visit — ${p.code}`, projectId: p.id, inspectorId: p.assignedInspectorId, dueDate: input.date, assigneeId: currentUserId(), status: "Open", createdAt: new Date().toISOString() })
      logActivity("Visit", v.id, p.id, `Scheduled ${input.type.toLowerCase()} visit on ${input.date}`)
      return toVisitRow(v)
    }, { mutate: true }),
  complete: (id: string, data: { unitsSpent: number; expenses: number; notes: string }) =>
    request(() => {
      const v = db.visits.find((x) => x.id === id) ?? notFound("Visit")
      if (v.status !== "Upcoming") throw new ApiError("Visit is already closed", 409)
      Object.assign(v, data, { status: "Completed", completedAt: new Date().toISOString() })
      logActivity("Visit", id, v.projectId, `Completed ${v.type.toLowerCase()} visit`)
      return toVisitRow(v)
    }, { mutate: true }),
  /**
   * Move an upcoming visit to another date. Keeps the history, moves its calendar reminder, keeps the job
   * schedule in step for job days (and re-queues the automatic reminder email), and can email the inspector.
   */
  reschedule: (id: string, input: RescheduleInput) =>
    request(() => {
      const v = db.visits.find((x) => x.id === id) ?? notFound("Visit")
      const p = proj(v.projectId) ?? notFound("Project")
      if (v.status !== "Upcoming") throw new ApiError("Only upcoming visits can be rescheduled", 409)
      if (p.stage === "Cancelled") throw new ApiError("This project is cancelled", 409)
      if (!input.date) throw new ApiError("Pick the new date", 422)
      if (input.date === v.date) throw new ApiError("Pick a different date", 422)
      if (input.date < toISODate(new Date())) throw new ApiError("The new date can't be in the past", 422)
      if (input.reason.trim().length < 3) throw new ApiError("Give a reason for rescheduling", 422)
      if (db.visits.some((x) => x.id !== v.id && x.projectId === v.projectId && x.status === "Upcoming" && x.date === input.date && x.type === v.type)) {
        throw new ApiError(`There is already a ${v.type.toLowerCase()} visit on ${formatDate(input.date)}`, 409)
      }
      const from = v.date
      const reminder = visitReminder(v)
      if (reminder) reminder.dueDate = input.date
      v.reschedules = [...(v.reschedules ?? []), { from, to: input.date, reason: input.reason.trim(), at: new Date().toISOString(), byId: currentUserId() }]
      v.date = input.date
      // job days mirror the project's schedule
      if (v.type === "Inspection" && p.schedule?.dates.includes(from)) {
        p.schedule.dates = [...new Set(p.schedule.dates.map((d) => (d === from ? input.date : d)))].sort()
        queueJobReminder(p)
      }
      if (input.notifyInspector) mailVisitRescheduled(p, from, input.date, v.type, input.reason.trim())
      logActivity("Visit", v.id, p.id, `Rescheduled ${v.type.toLowerCase()} visit from ${formatDate(from)} to ${formatDate(input.date)} — ${input.reason.trim()}`)
      return toVisitRow(v)
    }, { mutate: true }),
  cancel: (id: string) =>
    request(() => {
      const v = db.visits.find((x) => x.id === id) ?? notFound("Visit")
      if (v.status !== "Upcoming") throw new ApiError("Only upcoming visits can be cancelled", 409)
      v.status = "Cancelled"
      const reminder = visitReminder(v)
      if (reminder) reminder.status = "Done"
      logActivity("Visit", v.id, v.projectId, `Cancelled ${v.type.toLowerCase()} visit on ${formatDate(v.date)}`)
      return toVisitRow(v)
    }, { mutate: true }),
}

/* ───────────── Reminders ───────────── */

export interface ReminderRow extends Reminder {
  projectCode: string | null
  inspectorName: string | null
  assigneeName: string
}

const remRow = (r: Reminder): ReminderRow => ({
  ...r,
  projectCode: proj(r.projectId)?.code ?? null,
  inspectorName: db.inspectors.find((i) => i.id === r.inspectorId)?.name ?? null,
  assigneeName: db.users.find((u) => u.id === r.assigneeId)?.name ?? "—",
})

export type ReminderInput = Pick<Reminder, "type" | "title" | "projectId" | "inspectorId" | "dueDate" | "assigneeId">

export const reminderService = {
  list: () => request<ReminderRow[]>(() => db.reminders.map(remRow).sort((a, b) => a.dueDate.localeCompare(b.dueDate))),
  create: (input: ReminderInput) =>
    request(() => {
      const r: Reminder = { ...input, id: newId("rem"), status: "Open", createdAt: new Date().toISOString() }
      db.reminders.push(r)
      return remRow(r)
    }, { mutate: true }),
  setStatus: (id: string, status: Reminder["status"]) =>
    request(() => {
      const r = db.reminders.find((x) => x.id === id) ?? notFound("Reminder")
      r.status = status
      return remRow(r)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      db.reminders = db.reminders.filter((r) => r.id !== id)
      return id
    }, { mutate: true }),
}

/* ───────────── Portal notifications (role-scoped) ───────────── */

const myRole = () => useSessionStore.getState().user?.role
const visible = (roles: string[]) => {
  const r = myRole()
  return roles.length === 0 || r === "Super Admin" || (!!r && roles.includes(r))
}

export const notificationService = {
  list: () => request(() => db.notifications.filter((n) => visible(n.roles)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  markRead: (id: string) =>
    request(() => {
      const n = db.notifications.find((x) => x.id === id)
      if (n) n.read = true
      return id
    }, { mutate: true }),
  markAllRead: () =>
    request(() => {
      db.notifications.filter((n) => visible(n.roles)).forEach((n) => (n.read = true))
      return true
    }, { mutate: true }),
}

/* ───────────── Time & expenses (Operations — TBC) ───────────── */

export interface TimeRow extends TimeEntry {
  inspectorName: string
  projectCode: string
}

export const timeService = {
  list: () =>
    request<TimeRow[]>(() =>
      db.timeEntries
        .map((t) => ({ ...t, inspectorName: db.inspectors.find((i) => i.id === t.inspectorId)?.name ?? "—", projectCode: proj(t.projectId)?.code ?? "—" }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    ),
  create: (input: Omit<TimeEntry, "id" | "status">) =>
    request(() => {
      if (input.hours < 0 || input.expenseAmount < 0) throw new ApiError("Hours and amounts cannot be negative", 422)
      const t: TimeEntry = { ...input, id: newId("tim"), status: "Submitted" }
      db.timeEntries.unshift(t)
      return t
    }, { mutate: true }),
  setStatus: (id: string, status: TimeEntry["status"]) =>
    request(() => {
      const t = db.timeEntries.find((x) => x.id === id) ?? notFound("Entry")
      t.status = status
      return t
    }, { mutate: true }),
}
