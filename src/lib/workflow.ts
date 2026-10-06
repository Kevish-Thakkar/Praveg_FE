import { differenceInCalendarDays, parseISO } from "date-fns"
import { todayISO, toISODate } from "@/lib/dates"
import type { Candidate, Project, ProjectStage, RateBasis } from "@/types/domain"

/** The six workflow stages, in order. */
export const STAGES: { stage: Exclude<ProjectStage, "Cancelled">; short: string; hint: string }[] = [
  { stage: "Inquiry", short: "Inquiry", hint: "Client request captured, nearby inspectors found" },
  { stage: "Inspector Assigned", short: "Availability", hint: "Availability & confirmation emails sent to inspectors" },
  { stage: "CVs Sent", short: "CVs sent", hint: "CVs of available inspectors + price sent to client" },
  { stage: "Inspector Confirmed", short: "Confirmed", hint: "Interview or direct selection; inspector assigned" },
  { stage: "Job Scheduled", short: "Scheduled", hint: "Job date set; reminders to inspector" },
  { stage: "Completed", short: "Completed", hint: "Report received, completion mail sent to client" },
]

export function stageIndex(stage: ProjectStage): number {
  return STAGES.findIndex((s) => s.stage === stage)
}

export type NextActionKey =
  | "request" | "replies" | "price" | "sendCvs" | "decision" | "selection" | "interview" | "assign" | "schedule"
  | "reminder" | "jobDone" | "report" | "completion" | "invoice" | "payment" | "none"

export type Tone = "danger" | "warning" | "info" | "neutral" | "success"

export interface ProjectInsight {
  index: number
  /** short sub-status under the stage, e.g. "2/3 available · 1 awaiting reply" */
  checkpoint: string
  /** sub-steps for the current stage, for the stepper tooltip / detail */
  substeps: { label: string; done: boolean }[]
  next: { key: NextActionKey; label: string; owner: "Coordinator" | "Accounts" | "Client" | "Inspector" | "—" }
  nextDate: { label: string; date: string } | null
  due: { tone: Tone; text: string } | null
  blocked: string | null
}

const today = todayISO
const days = (date: string) => differenceInCalendarDays(parseISO(date.slice(0, 10)), parseISO(today()))
const fmt = (date: string) => parseISO(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })

function dueTone(date: string): ProjectInsight["due"] {
  const n = days(date)
  if (n < 0) return { tone: "danger", text: `${Math.abs(n)}d overdue` }
  if (n === 0) return { tone: "warning", text: "Today" }
  if (n <= 2) return { tone: "warning", text: `In ${n}d` }
  return { tone: "neutral", text: `In ${n}d` }
}

/** Everything the grid needs to show "where is this job and what's next" without opening it. */
export function describeProject(p: Project, cands: Candidate[], nearbyCount: number, assignedName: string | null, opts: { hideAccounts?: boolean } = {}): ProjectInsight {
  const index = stageIndex(p.stage)
  const requested = cands.length
  const available = cands.filter((c) => c.availability === "Available")
  const pending = cands.filter((c) => c.availability === "Requested").length
  const cvsSent = cands.filter((c) => c.cvSentAt).length
  const priced = !!p.pricing
  const needed = { label: "Needed by", date: p.requiredBy }

  switch (p.stage) {
    case "Inquiry":
      return {
        index, checkpoint: nearbyCount ? `${nearbyCount} nearby inspector${nearbyCount === 1 ? "" : "s"} match` : "No nearby match — search wider",
        substeps: [{ label: "Inquiry captured", done: true }, { label: "Availability requested", done: false }],
        next: { key: "request", label: "Request availability", owner: "Coordinator" }, nextDate: needed, due: dueTone(p.requiredBy), blocked: null,
      }
    case "Inspector Assigned": {
      const next: ProjectInsight["next"] = available.length
        ? priced ? { key: "sendCvs", label: `Send ${available.length} CV${available.length === 1 ? "" : "s"}`, owner: "Coordinator" } : { key: "price", label: "Set client price", owner: "Coordinator" }
        : pending ? { key: "replies", label: "Record replies", owner: "Inspector" } : { key: "request", label: "Request more inspectors", owner: "Coordinator" }
      return {
        index, checkpoint: `${available.length}/${requested} available${pending ? ` · ${pending} awaiting` : ""}${priced ? "" : " · price pending"}`,
        substeps: [{ label: "Availability requested", done: true }, { label: "Replies received", done: pending === 0 }, { label: "Client price set", done: priced }],
        next, nextDate: needed, due: dueTone(p.requiredBy), blocked: null,
      }
    }
    case "CVs Sent":
      return {
        index, checkpoint: `${cvsSent} CV${cvsSent === 1 ? "" : "s"} with client`,
        substeps: [{ label: "CVs & price sent", done: true }, { label: "Client decision", done: false }],
        next: { key: "decision", label: "Record client decision", owner: "Client" }, nextDate: needed, due: dueTone(p.requiredBy), blocked: null,
      }
    case "Inspector Confirmed": {
      const s = p.selection
      const interview = s?.mode === "Interview"
      const substeps = [
        { label: interview ? "Interview" : "Direct selection", done: !!s && (!interview || s.interviewResult === "Passed") },
        { label: "Inspector assigned", done: !!p.assignedInspectorId },
        { label: "Job date set", done: false },
      ]
      if (interview && s?.interviewResult === "Pending") {
        return { index, checkpoint: s.interviewAt ? `Interview ${fmt(s.interviewAt)} ${new Date(s.interviewAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Interview to be booked", substeps, next: { key: "interview", label: "Record interview result", owner: "Client" }, nextDate: s.interviewAt ? { label: "Interview", date: s.interviewAt } : needed, due: s.interviewAt ? dueTone(s.interviewAt) : null, blocked: null }
      }
      if (!p.assignedInspectorId) return { index, checkpoint: interview ? "Interview passed" : "Direct selection", substeps, next: { key: "assign", label: "Assign inspector", owner: "Coordinator" }, nextDate: needed, due: dueTone(p.requiredBy), blocked: null }
      return { index, checkpoint: `Assigned: ${assignedName ?? "—"}`, substeps, next: { key: "schedule", label: "Schedule job", owner: "Coordinator" }, nextDate: needed, due: dueTone(p.requiredBy), blocked: null }
    }
    case "Job Scheduled": {
      const dates = p.schedule?.dates ?? []
      const first = dates[0]!
      const last = dates[dates.length - 1]!
      const c = p.completion
      const substeps = [
        { label: "Job date set", done: true },
        { label: "Reminder (1 day before)", done: days(first) < 1 || (p.schedule?.remindersSent.length ?? 0) > 0 },
        { label: "Job done", done: !!c.jobDoneAt },
        { label: "Report received", done: !!c.reportUploadedAt },
        { label: "Completion mail", done: !!c.completionEmailSentAt },
      ]
      if (!c.jobDoneAt) {
        const started = days(first) <= 0
        return {
          index, checkpoint: `${assignedName ?? "Inspector"} · ${dates.length > 1 ? `${fmt(first)}–${fmt(last)}` : fmt(first)}`, substeps,
          next: days(last) < 0 ? { key: "jobDone", label: "Mark job done", owner: "Coordinator" } : started ? { key: "jobDone", label: "Mark job done", owner: "Coordinator" } : { key: "reminder", label: "Send reminder", owner: "Coordinator" },
          nextDate: { label: started ? "Job ends" : "Job starts", date: started ? last : first }, due: dueTone(started ? last : first), blocked: null,
        }
      }
      if (!c.reportUploadedAt) {
        const reportDue = toISODate(new Date(new Date(c.jobDoneAt).getTime() + 86400000))
        return { index, checkpoint: "Job done · report awaited", substeps, next: { key: "report", label: "Upload report", owner: "Inspector" }, nextDate: { label: "Report due", date: reportDue }, due: dueTone(reportDue), blocked: null }
      }
      return { index, checkpoint: "Report received", substeps, next: { key: "completion", label: "Send completion mail", owner: "Coordinator" }, nextDate: null, due: { tone: "warning", text: "Ready" }, blocked: null }
    }
    case "Completed": {
      if (opts.hideAccounts) {
        const sent = p.completion.completionEmailSentAt
        return { index, checkpoint: sent ? `Completion mail sent ${fmt(sent.slice(0, 10))}` : "Completed", substeps: [{ label: "Completion mail sent", done: true }], next: { key: "none", label: "Done", owner: "—" }, nextDate: null, due: null, blocked: null }
      }
      const b = p.billing
      const substeps = [{ label: "Completion mail sent", done: true }, { label: "Invoice uploaded", done: !!b.invoice }, { label: "Payment received", done: b.status === "Paid" }]
      if (b.status === "Invoice Pending") return { index, checkpoint: "Invoice pending", substeps, next: { key: "invoice", label: "Upload invoice", owner: "Accounts" }, nextDate: null, due: { tone: "warning", text: "To invoice" }, blocked: null }
      if (b.status === "Awaiting Payment" && b.invoice) return { index, checkpoint: `${b.invoice.number} · awaiting payment`, substeps, next: { key: "payment", label: days(b.invoice.dueDate) < 0 ? "Send follow-up" : "Confirm payment", owner: "Accounts" }, nextDate: { label: "Payment due", date: b.invoice.dueDate }, due: dueTone(b.invoice.dueDate), blocked: null }
      return { index, checkpoint: b.status === "Paid" ? "Paid" : "Completed", substeps, next: { key: "none", label: "Done", owner: "—" }, nextDate: null, due: null, blocked: null }
    }
    default:
      return { index: -1, checkpoint: p.cancelledReason ?? "Cancelled", substeps: [], next: { key: "none", label: "—", owner: "—" }, nextDate: null, due: null, blocked: null }
  }
}

export function unitLabel(basis: RateBasis, units: number): string {
  if (basis === "Lump Sum") return "Lump sum"
  const u = basis === "Man-Day" ? "day" : "hour"
  return `${units} ${u}${units === 1 ? "" : "s"}`
}

export function pricingTotal(p: Pick<Project, "pricing">): number {
  if (!p.pricing) return 0
  return p.pricing.rateBasis === "Lump Sum" ? p.pricing.clientRate : p.pricing.clientRate * p.pricing.units
}

/* ───────────── Accounts view: the invoice flow ───────────── */

export const BILLING_STEPS = [
  { key: "price", short: "Pricing", hint: "Client price to be set" },
  { key: "job", short: "Job in progress", hint: "Coordinator is running the job" },
  { key: "invoice", short: "Invoice pending", hint: "Job completed — upload the invoice" },
  { key: "awaiting", short: "Awaiting payment", hint: "Invoice sent — follow up by due date" },
  { key: "paid", short: "Paid", hint: "Payment confirmed" },
] as const

export type BillingNextKey = "setPrice" | "waitJob" | "uploadInvoice" | "remind" | "followUp" | "confirmPayment" | "none"

export interface BillingInsight {
  index: number
  label: string
  checkpoint: string
  next: { key: BillingNextKey; label: string; owner: "Accounts" | "Coordinator" | "Client" | "—" }
  due: { tone: Tone; text: string } | null
  dueDate: { label: string; date: string } | null
  blocked: string | null
}

/** Where a project sits in the invoice flow, and the next accounts action. */
export function describeBilling(p: Project, jobStage: string): BillingInsight {
  const b = p.billing
  const inv = b.invoice
  if (p.stage === "Cancelled") return { index: -1, label: "Cancelled", checkpoint: p.cancelledReason ?? "Cancelled", next: { key: "none", label: "—", owner: "—" }, due: null, dueDate: null, blocked: null }
  if (b.status === "Paid" && b.payment) {
    const late = inv && b.payment.date > inv.dueDate
    return { index: 4, label: "Paid", checkpoint: `Paid ${fmt(b.payment.date)} · ${b.payment.method}${late ? " · late" : " · on time"}`, next: { key: "none", label: "Closed", owner: "—" }, due: null, dueDate: { label: "Paid on", date: b.payment.date }, blocked: null }
  }
  if (b.status === "Awaiting Payment" && inv) {
    const n = days(inv.dueDate)
    const last = b.reminders.at(-1)
    const recent = last ? days(last.at.slice(0, 10)) > -3 : false
    const next: BillingInsight["next"] =
      n < 0 && !recent ? { key: "followUp", label: "Send follow-up", owner: "Accounts" }
        : n <= 7 && !recent ? { key: "remind", label: "Send reminder", owner: "Accounts" }
          : { key: "confirmPayment", label: "Confirm payment", owner: "Client" }
    const sent = b.reminders.length ? ` · ${b.reminders.length} follow-up${b.reminders.length === 1 ? "" : "s"} sent` : ""
    return { index: 3, label: "Awaiting payment", checkpoint: `${inv.number} · invoiced ${fmt(inv.date)}${sent}`, next, due: dueTone(inv.dueDate), dueDate: { label: "Payment due", date: inv.dueDate }, blocked: null }
  }
  if (b.status === "Invoice Pending") {
    const sent = p.completion.completionEmailSentAt
    return { index: 2, label: "Invoice pending", checkpoint: sent ? `Completion mail sent ${fmt(sent.slice(0, 10))}` : "Job completed", next: { key: "uploadInvoice", label: "Upload invoice", owner: "Accounts" }, due: { tone: "warning", text: "To invoice" }, dueDate: null, blocked: null }
  }
  if (!p.pricing) {
    return {
      index: 0, label: "Pricing",
      checkpoint: p.pricingRequestedAt ? `Price requested ${fmt(p.pricingRequestedAt.slice(0, 10))}` : `Not requested yet · job at ${jobStage}`,
      next: { key: "setPrice", label: "Set client price", owner: "Accounts" },
      due: p.pricingRequestedAt ? { tone: "warning", text: "Requested" } : null, dueDate: { label: "Needed by", date: p.requiredBy },
      blocked: p.pricingRequestedAt ? "Coordinator is waiting to send CVs" : null,
    }
  }
  const nextDate = p.schedule?.dates[0]
  return {
    index: 1, label: "Job in progress", checkpoint: `Price set · job at ${jobStage}`,
    next: { key: "waitJob", label: "Waiting for completion", owner: "Coordinator" },
    due: null, dueDate: nextDate ? { label: "Job starts", date: nextDate } : { label: "Needed by", date: p.requiredBy }, blocked: null,
  }
}
