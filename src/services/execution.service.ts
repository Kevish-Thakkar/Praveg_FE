import { db, newId } from "@/mock/db"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { PurchaseOrder, Reminder, TimeEntry, Visit } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

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
      if (!p.assignedInspectorId) throw new ApiError("A PO can be recorded once an inspector is confirmed", 409)
      if (input.poNumber && db.purchaseOrders.some((x) => x.poNumber === input.poNumber && x.projectId !== projectId)) {
        throw new ApiError(`PO number ${input.poNumber} is already used on another project`, 409)
      }
      let po = db.purchaseOrders.find((x) => x.projectId === projectId)
      if (!po) {
        po = { id: newId("po"), projectId, clientId: p.clientId, ...input }
        db.purchaseOrders.unshift(po)
      } else Object.assign(po, input)
      logActivity("Purchase Order", po.id, projectId, `Recorded PO ${input.poNumber || "(pending)"} for ${p.code}`)
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
  cancel: (id: string) =>
    request(() => {
      const v = db.visits.find((x) => x.id === id) ?? notFound("Visit")
      v.status = "Cancelled"
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
