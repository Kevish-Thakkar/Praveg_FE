import { differenceInCalendarDays, parseISO } from "date-fns"
import { todayISO, toISODate } from "@/lib/dates"
import { db, newId } from "@/mock/db"
import { closedAt, pricingTotal } from "@/lib/workflow"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { BillingStatus, InvoiceDetails, PaymentDetails, Project } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"
import { recordEmail, type EmailDraft } from "./email.service"
import type { FileMeta } from "./party.service"

/**
 * Accounts view of completed jobs. The invoice itself is produced outside the platform (accounting system);
 * Accounts uploads it here with the key fields so due dates, reminders and follow-ups can be tracked.
 */

export type DueState = "Not due" | "Due soon" | "Due today" | "Overdue" | "—"

export interface BillingRow {
  projectId: string
  code: string
  title: string
  clientId: string
  clientName: string
  serviceName: string
  inspectorName: string
  completedAt: string | null
  status: BillingStatus
  paymentTermsDays: number
  priceTotal: number
  currency: string
  invoice: InvoiceDetails | null
  payment: PaymentDetails | null
  reminders: Project["billing"]["reminders"]
  daysToDue: number | null
  dueState: DueState
  /** what the UI should suggest next */
  suggestion: "Upload invoice" | "Send reminder" | "Send follow-up" | "Confirm payment" | null
  lastReminderAt: string | null
}

const todayIso = todayISO

export function addDays(date: string, n: number): string {
  const d = parseISO(date)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

function toRow(p: Project): BillingRow {
  const client = db.clients.find((c) => c.id === p.clientId)
  const inv = p.billing.invoice
  const daysToDue = inv && p.billing.status === "Awaiting Payment" ? differenceInCalendarDays(parseISO(inv.dueDate), parseISO(todayIso())) : null
  const dueState: DueState =
    daysToDue === null ? "—" : daysToDue < 0 ? "Overdue" : daysToDue === 0 ? "Due today" : daysToDue <= db.settings.paymentReminderDays ? "Due soon" : "Not due"
  const last = p.billing.reminders.at(-1)?.at ?? null
  const remindedRecently = last ? differenceInCalendarDays(new Date(), new Date(last)) < 3 : false
  const suggestion: BillingRow["suggestion"] =
    p.billing.status === "Invoice Pending" ? "Upload invoice"
      : p.billing.status !== "Awaiting Payment" ? null
        : dueState === "Overdue" && !remindedRecently ? "Send follow-up"
          : (dueState === "Due soon" || dueState === "Due today") && !remindedRecently ? "Send reminder"
            : "Confirm payment"
  return {
    projectId: p.id, code: p.code, title: p.title, clientId: p.clientId, clientName: client?.name ?? "—",
    serviceName: db.projectTypes.find((t) => t.id === p.serviceId)?.name ?? "—",
    inspectorName: db.inspectors.find((i) => i.id === p.assignedInspectorId)?.name ?? "—",
    completedAt: closedAt(p), status: p.billing.status, paymentTermsDays: client?.paymentTermsDays ?? 30,
    priceTotal: pricingTotal(p), currency: p.pricing?.currency ?? client?.currency ?? "INR",
    invoice: inv, payment: p.billing.payment, reminders: p.billing.reminders, daysToDue, dueState, suggestion, lastReminderAt: last,
  }
}

const billable = () => db.projects.filter((p) => p.billing.status !== "Not Billable")
const getP = (id: string) => db.projects.find((p) => p.id === id) ?? notFound("Project")

export type InvoiceInput = Omit<InvoiceDetails, "documentId" | "enteredById" | "dueDate" | "total"> & { dueDate?: string }
export type PaymentInput = Omit<PaymentDetails, "recordedById">

export interface BillingSummary {
  invoicePending: number
  awaiting: number
  dueSoon: number
  overdue: number
  outstanding: { currency: string; amount: number }[]
  overdueAmount: { currency: string; amount: number }[]
  receivedThisMonth: { currency: string; amount: number }[]
}

const sumBy = (pairs: { currency: string; amount: number }[]) =>
  Object.entries(pairs.reduce<Record<string, number>>((a, p) => ({ ...a, [p.currency]: (a[p.currency] ?? 0) + p.amount }), {})).map(([currency, amount]) => ({ currency, amount }))

export function billingSummary(): BillingSummary {
  const rows = billable().map(toRow)
  const awaiting = rows.filter((r) => r.status === "Awaiting Payment" && r.invoice)
  const month = todayIso().slice(0, 7)
  return {
    invoicePending: rows.filter((r) => r.status === "Invoice Pending").length,
    awaiting: awaiting.length,
    dueSoon: awaiting.filter((r) => r.dueState === "Due soon" || r.dueState === "Due today").length,
    overdue: awaiting.filter((r) => r.dueState === "Overdue").length,
    outstanding: sumBy(awaiting.map((r) => ({ currency: r.invoice!.currency, amount: r.invoice!.total }))),
    overdueAmount: sumBy(awaiting.filter((r) => r.dueState === "Overdue").map((r) => ({ currency: r.invoice!.currency, amount: r.invoice!.total }))),
    receivedThisMonth: sumBy(rows.filter((r) => r.payment?.date.startsWith(month)).map((r) => ({ currency: r.invoice?.currency ?? r.currency, amount: r.payment!.amount }))),
  }
}

/* ───────────── Income (per currency — INR for India, AED for UAE; never mixed) ───────────── */

export const CURRENCIES = ["INR", "AED"] as const
export type IncomeCurrency = (typeof CURRENCIES)[number]
export interface Figure { amount: number; count: number }
export interface IncomeFigures {
  receivedMonth: Figure
  received6m: Figure
  outstanding: Figure
  overdue: Figure
  dueSoon: Figure
  toInvoice: Figure
}

const fig = (xs: number[]): Figure => ({ amount: xs.reduce((a, b) => a + b, 0), count: xs.length })
const monthsBack = (n: number) =>
  Array.from({ length: n }, (_, k) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (n - 1 - k))
    return { key: toISODate(d).slice(0, 7), label: d.toLocaleString("en-GB", { month: "short" }) }
  })

export function incomeByCurrency(): Record<IncomeCurrency, IncomeFigures> {
  const rows = billable().map(toRow)
  const month = todayIso().slice(0, 7)
  const since = monthsBack(6)[0]!.key
  const out = {} as Record<IncomeCurrency, IncomeFigures>
  for (const c of CURRENCIES) {
    const inCur = rows.filter((r) => (r.invoice?.currency ?? r.currency) === c)
    const awaiting = inCur.filter((r) => r.status === "Awaiting Payment" && r.invoice)
    const paid = inCur.filter((r) => r.payment)
    out[c] = {
      receivedMonth: fig(paid.filter((r) => r.payment!.date.startsWith(month)).map((r) => r.payment!.amount)),
      received6m: fig(paid.filter((r) => r.payment!.date.slice(0, 7) >= since).map((r) => r.payment!.amount)),
      outstanding: fig(awaiting.map((r) => r.invoice!.total)),
      overdue: fig(awaiting.filter((r) => r.dueState === "Overdue").map((r) => r.invoice!.total)),
      dueSoon: fig(awaiting.filter((r) => r.dueState === "Due soon" || r.dueState === "Due today").map((r) => r.invoice!.total)),
      toInvoice: fig(inCur.filter((r) => r.status === "Invoice Pending").map((r) => r.priceTotal)),
    }
  }
  return out
}

export interface IncomeCharts {
  monthly: { month: string; invoiced: number; received: number }[]
  outstandingByClient: { client: string; amount: number }[]
}

/** Chart data for one currency: invoiced vs received per month (last 6), outstanding by client. */
export function incomeCharts(currency: IncomeCurrency): IncomeCharts {
  const rows = billable().map(toRow).filter((r) => (r.invoice?.currency ?? r.currency) === currency)
  const monthly = monthsBack(6).map((m) => ({
    month: m.label,
    invoiced: rows.filter((r) => r.invoice?.date.startsWith(m.key)).reduce((a, r) => a + r.invoice!.total, 0),
    received: rows.filter((r) => r.payment?.date.startsWith(m.key)).reduce((a, r) => a + r.payment!.amount, 0),
  }))
  const byClient = new Map<string, number>()
  rows.filter((r) => r.status === "Awaiting Payment" && r.invoice).forEach((r) => byClient.set(r.clientName, (byClient.get(r.clientName) ?? 0) + r.invoice!.total))
  return { monthly, outstandingByClient: [...byClient.entries()].map(([client, amount]) => ({ client, amount })).sort((a, b) => b.amount - a.amount) }
}

export const billingService = {
  list: () => request<BillingRow[]>(() => billable().map(toRow).sort((a, b) => (a.daysToDue ?? 999) - (b.daysToDue ?? 999))),
  get: (projectId: string) => request<BillingRow>(() => toRow(getP(projectId))),
  summary: () => request(billingSummary),
  /** Income totals are Super Admin only. */
  income: () => request(() => {
    if (useSessionStore.getState().user?.role !== "Super Admin") throw new ApiError("Income figures are visible to Super Admin only", 403)
    return incomeByCurrency()
  }),
  charts: (currency: IncomeCurrency) => request(() => incomeCharts(currency)),

  uploadInvoice: (projectId: string, input: InvoiceInput, file: FileMeta) =>
    request(() => {
      const p = getP(projectId)
      if (p.billing.status !== "Invoice Pending" && p.billing.status !== "Awaiting Payment") throw new ApiError("This job is not ready for invoicing", 409)
      if (!input.number.trim()) throw new ApiError("Invoice number is required", 422)
      if (input.amount <= 0) throw new ApiError("Amount must be greater than zero", 422)
      if (db.projects.some((x) => x.id !== projectId && x.billing.invoice?.number === input.number)) throw new ApiError(`Invoice ${input.number} is already recorded on another job`, 409)
      const terms = db.clients.find((c) => c.id === p.clientId)?.paymentTermsDays ?? 30
      const docId = newId("doc")
      db.documents.unshift({ id: docId, name: file.name, category: "Invoice", entityType: "Project", entityId: p.id, sizeKb: file.sizeKb, mimeType: file.mimeType, access: "Restricted", uploadedById: currentUserId(), uploadedAt: new Date().toISOString() })
      p.billing.invoice = { ...input, total: input.amount + input.taxAmount, dueDate: input.dueDate || addDays(input.date, terms), documentId: docId, enteredById: currentUserId() }
      p.billing.status = "Awaiting Payment"
      const po = db.purchaseOrders.find((x) => x.projectId === p.id)
      if (po && po.status === "Received") po.status = "Invoiced"
      logActivity("Billing", p.id, p.id, `Invoice ${input.number} uploaded — due ${p.billing.invoice.dueDate}`)
      return toRow(p)
    }, { mutate: true }),

  sendPaymentEmail: (projectId: string, kind: "Reminder" | "Follow-up", email: EmailDraft) =>
    request(() => {
      const p = getP(projectId)
      if (p.billing.status !== "Awaiting Payment") throw new ApiError("No payment is awaited for this job", 409)
      recordEmail(email)
      p.billing.reminders.push({ at: new Date().toISOString(), kind })
      logActivity("Billing", p.id, p.id, `Payment ${kind.toLowerCase()} sent to client`)
      return toRow(p)
    }, { mutate: true }),

  confirmPayment: (projectId: string, input: PaymentInput) =>
    request(() => {
      const p = getP(projectId)
      if (p.billing.status !== "Awaiting Payment" || !p.billing.invoice) throw new ApiError("Upload the invoice first", 409)
      if (input.amount <= 0) throw new ApiError("Amount must be greater than zero", 422)
      p.billing.payment = { ...input, recordedById: currentUserId() }
      p.billing.status = "Paid"
      const po = db.purchaseOrders.find((x) => x.projectId === p.id)
      if (po) po.status = "Closed"
      db.notifications.unshift({ id: newId("ntf"), kind: "Finance", title: `Payment received — ${p.code}`, body: `${input.amount} ${p.billing.invoice.currency} via ${input.method}`, link: "/finance", read: false, roles: ["Super Admin", "Accountant"], createdAt: new Date().toISOString() })
      logActivity("Billing", p.id, p.id, `Payment confirmed (${input.reference || input.method})`)
      return toRow(p)
    }, { mutate: true }),
}
