/**
 * Project workflow model — major checkpoints and their substeps, derived only from data the
 * platform already records (project, availability requests, PO, visits, billing). Nothing here
 * is stored separately, so the checkpoints can never disagree with the underlying records.
 *
 * Two tracks:
 *  - operations (Coordinator): Requirement → Inspector sourcing → Inspector onboarding → Job execution → Report & completion
 *  - finance    (Accountant):  Client pricing → Purchase order → Job completion → Invoicing → Payment collection
 * Super Admin sees both.
 */
import { addDays, differenceInCalendarDays, parseISO } from "date-fns"
import { formatDate, todayISO, toISODate } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import type { Role } from "@/types/domain"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "@/features/projects/components/workflow/types"

export type CheckpointStatus = "not_started" | "in_progress" | "completed" | "blocked" | "failed" | "skipped"
export type SubStepStatus = "done" | "current" | "pending" | "blocked" | "failed" | "skipped"
export type WorkflowTrack = "operations" | "finance"

export type CheckpointActionKey =
  | "editProject" | "requestAvailability" | "recordReplies" | "requestPrice" | "setPrice" | "sendCvs"
  | "recordDecision" | "interviewPassed" | "interviewFailed" | "assignInspector"
  | "scheduleJob" | "sendReminder" | "markJobDone" | "scheduleVisit" | "recordPO"
  | "uploadReport" | "sendCompletion" | "sendDocuments"
  | "uploadInvoice" | "sendPaymentReminder" | "sendPaymentFollowUp" | "confirmPayment"

export interface SubStep {
  id: string
  label: string
  status: SubStepStatus
  at?: string | null
  note?: string
}

export interface Checkpoint {
  id: string
  track: WorkflowTrack
  title: string
  description: string
  status: CheckpointStatus
  /** 0–100, from substeps (skipped substeps count as done) */
  progress: number
  /** one-line state, e.g. "2 of 3 replied" */
  statusNote: string
  owner: string
  ownerName?: string | null
  startDate: string | null
  dueDate: { label: string; date: string } | null
  completedAt: string | null
  dependencies: string[]
  blockedReason: string | null
  substeps: SubStep[]
  actions: CheckpointActionKey[]
  /** activity messages that belong to this checkpoint */
  activity: RegExp
}

export interface PoLike { poNumber: string; status: string; amount: number; currency: string; issueDate: string | null }
export interface VisitLike { type: string; status: string; date: string }

export interface WorkflowInput {
  p: ProjectRow
  candidates?: CandidateRow[]
  pos?: PoLike[]
  visits?: VisitLike[]
}

export const STATUS_LABEL: Record<CheckpointStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  blocked: "Blocked",
  failed: "Cancelled",
  skipped: "Skipped",
}

export const SUBSTEP_LABEL: Record<SubStepStatus, string> = {
  done: "Done", current: "In progress", pending: "Not started", blocked: "Blocked", failed: "Failed", skipped: "Skipped",
}

export function statusText(c: Pick<Checkpoint, "status" | "progress">) {
  return c.status === "in_progress" ? `${STATUS_LABEL[c.status]} · ${c.progress}%` : STATUS_LABEL[c.status]
}

const d = (iso: string | null | undefined) => (iso ? formatDate(iso.slice(0, 10), "dd MMM") : "")
const days = (iso: string) => differenceInCalendarDays(parseISO(iso.slice(0, 10)), parseISO(todayISO()))
const min = (xs: (string | null | undefined)[]) => xs.filter(Boolean).sort()[0] ?? null
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`

function progressOf(subs: SubStep[], status: CheckpointStatus) {
  if (status === "completed") return 100
  if (!subs.length) return 0
  const done = subs.filter((s) => s.status === "done" || s.status === "skipped").length
  return Math.round((done / subs.length) * 100)
}

/** mark the first unfinished substep as current when the checkpoint is active */
function markCurrent(subs: SubStep[], active: boolean) {
  if (!active) return subs
  const i = subs.findIndex((s) => s.status === "pending")
  if (i >= 0 && !subs.some((s) => s.status === "current" || s.status === "blocked")) subs[i] = { ...subs[i]!, status: "current" }
  return subs
}

function cp(c: Omit<Checkpoint, "progress">): Checkpoint {
  const substeps = markCurrent(c.substeps, c.status === "in_progress" || c.status === "blocked")
  return { ...c, substeps, progress: progressOf(substeps, c.status), actions: c.status === "completed" || c.status === "skipped" ? c.actions.filter((a) => KEEP_WHEN_DONE.has(a)) : c.actions }
}
/** actions still useful after a checkpoint is complete */
const KEEP_WHEN_DONE = new Set<CheckpointActionKey>(["sendDocuments", "scheduleVisit", "recordPO"])

/* ───────────────────────── Operations (Coordinator) ───────────────────────── */

export function operationsTrack({ p, candidates = [], pos = [], visits = [] }: WorkflowInput): Checkpoint[] {
  const cancelled = p.stage === "Cancelled"
  const asked = candidates.length || p.candidateCount
  const available = candidates.filter((c) => c.availability === "Available")
  const availableCount = candidates.length ? available.length : p.availableCount
  const pending = candidates.filter((c) => c.availability === "Requested").length
  const replied = asked - pending
  const cvsSent = candidates.filter((c) => c.cvSentAt)
  const firstCv = min(cvsSent.map((c) => c.cvSentAt))
  const stageIdx = ["Inquiry", "Inspector Assigned", "CVs Sent", "Inspector Confirmed", "Job Scheduled", "Completed"].indexOf(p.stage)
  const pastSourcing = stageIdx >= 2 || cvsSent.length > 0
  const s = p.selection
  const interview = s?.mode === "Interview"
  const assigned = !!p.assignedInspectorId
  const c = p.completion
  const po = pos[0]
  const jobVisits = visits.filter((v) => v.type === "Inspection" && v.status !== "Cancelled")
  const doneVisits = jobVisits.filter((v) => v.status === "Completed").length

  /* 1 — Requirement */
  const reqDone = asked > 0 || stageIdx >= 1
  const requirement = cp({
    id: "requirement", track: "operations", title: "Requirement",
    description: "The client's request is captured: service, scope, required skills, site and the date it is needed by. Nearby inspectors with matching skills are shortlisted.",
    status: reqDone ? "completed" : "in_progress",
    statusNote: reqDone ? `Captured ${d(p.createdAt)}` : p.nearbyCount ? `${plural(p.nearbyCount, "nearby inspector")} match` : "No nearby match yet",
    owner: "Coordinator", ownerName: p.coordinatorName,
    startDate: p.createdAt, dueDate: null, completedAt: min(candidates.map((x) => x.requestedAt)),
    dependencies: [], blockedReason: null,
    substeps: [
      { id: "captured", label: "Inquiry captured", status: "done", at: p.createdAt },
      { id: "scope", label: "Scope & required skills", status: p.requiredSkills.length || p.description ? "done" : "skipped", note: p.requiredSkills.length ? p.requiredSkills.join(", ") : p.description ? "Scope noted" : "No specific skills" },
      { id: "site", label: "Site location confirmed", status: p.site.city ? "done" : "pending", note: p.site.city ? `${p.site.city}, ${p.site.state}` : undefined },
      { id: "shortlist", label: "Inspectors shortlisted & availability requested", status: reqDone ? "done" : "pending", at: min(candidates.map((x) => x.requestedAt)), note: reqDone ? plural(asked, "inspector") : p.nearbyCount ? `${p.nearbyCount} nearby match` : undefined },
    ],
    actions: ["requestAvailability", "editProject"],
    activity: /Created inquiry|Updated project details/i,
  })

  /* 2 — Inspector sourcing */
  const noneAvailable = asked > 0 && pending === 0 && availableCount === 0
  const waitingPrice = availableCount > 0 && !p.pricing
  const sourcingStatus: CheckpointStatus = pastSourcing ? "completed" : !reqDone ? "not_started" : noneAvailable ? "blocked" : waitingPrice && pending === 0 ? "blocked" : "in_progress"
  const sourcing = cp({
    id: "sourcing", track: "operations", title: "Inspector sourcing",
    description: "Availability & confirmation requests go to the shortlisted inspectors. Once someone is available and Accounts has set the client price, their CVs and the price are sent to the client.",
    status: sourcingStatus,
    statusNote: pastSourcing ? `${plural(cvsSent.length || 1, "CV")} sent ${d(firstCv)}` : asked ? `${availableCount}/${asked} available${pending ? ` · ${pending} awaiting` : ""}` : "Starts when availability is requested",
    owner: "Coordinator", ownerName: p.coordinatorName,
    startDate: min(candidates.map((x) => x.requestedAt)), dueDate: null, completedAt: firstCv,
    dependencies: ["pricing"],
    blockedReason: sourcingStatus === "blocked" ? (noneAvailable ? "No inspector is available — request more inspectors" : "Waiting for Accounts to set the client price") : null,
    substeps: [
      { id: "requested", label: "Availability requested", status: asked ? "done" : "pending", at: min(candidates.map((x) => x.requestedAt)), note: asked ? plural(asked, "inspector") : undefined },
      { id: "replies", label: "Replies received", status: !asked ? "pending" : pending === 0 ? "done" : "current", note: asked ? `${replied} of ${asked} replied` : undefined },
      { id: "available", label: "Inspector available", status: availableCount ? "done" : noneAvailable ? "blocked" : "pending", note: availableCount ? `${plural(availableCount, "inspector")} available` : noneAvailable ? "Nobody available" : undefined },
      { id: "price", label: "Client price set by Accounts", status: p.pricing ? "done" : waitingPrice ? "blocked" : "pending", at: p.pricing?.setAt, note: p.pricing ? "Set" : p.pricingRequestedAt ? `Requested ${d(p.pricingRequestedAt)}` : "Not requested yet" },
      { id: "cvs", label: "CVs & price sent to client", status: pastSourcing ? "done" : "pending", at: firstCv, note: cvsSent.length ? plural(cvsSent.length, "CV") : undefined },
    ],
    // ordered by what should happen next: the first allowed action becomes the primary button
    actions: [
      ...(availableCount && !p.pricing ? (["requestPrice", "setPrice"] as const) : []),
      ...(availableCount && p.pricing ? ["sendCvs" as const] : []),
      ...(pending ? ["recordReplies" as const] : []),
      ...(!availableCount && !p.pricing ? (["requestPrice", "setPrice"] as const) : []),
      "requestAvailability",
    ],
    activity: /availability|is available|is not available|Client price set|CV\(s\)/i,
  })

  /* 3 — Inspector onboarding */
  const failedBefore = stageIdx === 2 ? candidates.filter((x) => x.outcome === "Not Selected") : []
  const onboardingStatus: CheckpointStatus = assigned ? "completed" : stageIdx >= 2 ? "in_progress" : "not_started"
  const onboarding = cp({
    id: "onboarding", track: "operations", title: "Inspector onboarding",
    description: "The client either selects an inspector directly or interviews first. The selected inspector is assigned and receives the confirmation email.",
    status: onboardingStatus,
    statusNote: assigned ? `${p.assignedInspectorName} assigned` : s ? (interview ? (s.interviewResult === "Pending" ? `Interview ${d(s.interviewAt)}` : `Interview ${s.interviewResult?.toLowerCase()}`) : "Direct selection") : stageIdx === 2 ? "Waiting for the client's decision" : "Starts when CVs are sent",
    owner: "Coordinator", ownerName: p.coordinatorName,
    startDate: firstCv, dueDate: s?.interviewAt && s.interviewResult === "Pending" ? { label: "Interview", date: s.interviewAt } : null, completedAt: null,
    dependencies: ["sourcing"], blockedReason: null,
    substeps: [
      ...failedBefore.map((x) => ({ id: `failed-${x.id}`, label: `Earlier choice not selected — ${x.inspector.name}`, status: "failed" as const, note: "Interview not passed" })),
      { id: "decision", label: "Client decision", status: s || assigned ? "done" : "pending", note: s ? (interview ? "Interview requested" : "Direct selection") : undefined },
      { id: "interview", label: "Interview scheduled", status: s && !interview ? "skipped" : interview ? "done" : "pending", at: s?.interviewAt, note: s && !interview ? "Not needed — direct selection" : undefined },
      { id: "result", label: "Interview result", status: s && !interview ? "skipped" : s?.interviewResult === "Passed" ? "done" : s?.interviewResult === "Failed" ? "failed" : "pending", note: s && !interview ? "Not needed" : s?.interviewResult === "Pending" ? "Awaiting the client" : s?.interviewResult ?? undefined },
      { id: "assigned", label: "Inspector assigned", status: assigned ? "done" : "pending", note: p.assignedInspectorName ?? undefined },
      { id: "confirmation", label: "Confirmation email to inspector", status: assigned ? "done" : "pending" },
    ],
    actions: [
      ...(stageIdx === 2 ? ["recordDecision" as const] : []),
      ...(interview && s?.interviewResult === "Pending" ? (["interviewPassed", "interviewFailed"] as const) : []),
      ...(stageIdx === 3 && !assigned && (!interview || s?.interviewResult === "Passed") ? ["assignInspector" as const] : []),
    ],
    activity: /interview|directly|Assigned /i,
  })

  /* 4 — Job execution */
  const sch = p.schedule
  const first = sch?.dates[0]
  const last = sch?.dates.at(-1)
  const execStatus: CheckpointStatus = c.jobDoneAt ? "completed" : assigned ? "in_progress" : "not_started"
  const reminderDone = (sch?.remindersSent.length ?? 0) > 0 || (!!first && days(first) < 1)
  const execution = cp({
    id: "execution", track: "operations", title: "Job execution",
    description: "Job dates are set and appear on the calendar. A reminder goes to the inspector automatically one day before. The client's PO is recorded against the job.",
    status: execStatus,
    statusNote: c.jobDoneAt ? `Job done ${d(c.jobDoneAt)}` : sch ? `${d(first)}${last !== first ? `–${d(last)}` : ""} · ${p.assignedInspectorName ?? "inspector"}` : assigned ? "Job dates to be set" : "Starts when the inspector is assigned",
    owner: "Coordinator", ownerName: p.coordinatorName,
    startDate: first ?? null, dueDate: last ? { label: "Job ends", date: last } : { label: "Needed by", date: p.requiredBy }, completedAt: c.jobDoneAt,
    dependencies: ["onboarding"], blockedReason: null,
    substeps: [
      { id: "dates", label: "Job date(s) set", status: sch ? "done" : "pending", note: sch ? sch.dates.map((x) => d(x)).join(", ") : undefined },
      { id: "po", label: "Client PO received", status: !po ? "pending" : po.status === "Awaiting PO" ? "pending" : "done", note: po ? (po.poNumber ? po.poNumber : "Awaiting client PO") : assigned ? "No PO record" : undefined },
      { id: "reminder", label: "Reminder to inspector (1 day before)", status: reminderDone ? "done" : "pending", at: sch?.remindersSent.at(-1), note: reminderDone && !sch?.remindersSent.length ? "Automatic" : sch?.remindersSent.length ? `${plural(sch.remindersSent.length, "manual reminder")}` : undefined },
      { id: "visits", label: "Job day(s) carried out", status: c.jobDoneAt ? "done" : "pending", note: jobVisits.length ? `${doneVisits} of ${plural(jobVisits.length, "visit")} completed` : undefined },
      { id: "done", label: "Job marked done", status: c.jobDoneAt ? "done" : "pending", at: c.jobDoneAt },
    ],
    actions: [
      ...(sch && !c.jobDoneAt ? (p.insight.next.key === "jobDone" ? (["markJobDone", "sendReminder"] as const) : (["sendReminder", "markJobDone"] as const)) : []),
      ...(assigned && !c.jobDoneAt ? ["scheduleJob" as const] : []),
      ...(assigned ? (["scheduleVisit", "recordPO"] as const) : []),
    ],
    activity: /Job scheduled|visit|Recorded PO|reminder|Job done/i,
  })

  /* 5 — Report & completion */
  const reportDue = c.jobDoneAt ? toISODate(addDays(parseISO(c.jobDoneAt), 1)) : null
  const closureStatus: CheckpointStatus = p.stage === "Completed" ? "completed" : c.jobDoneAt ? "in_progress" : "not_started"
  const closure = cp({
    id: "closure", track: "operations", title: "Report & completion",
    description: "The report request goes to the inspector automatically the morning after the job. Once the report is uploaded, the completion email with documents goes to the client and the project closes.",
    status: closureStatus,
    statusNote: p.stage === "Completed" ? `Completion mail sent ${d(c.completionEmailSentAt)}` : c.reportUploadedAt ? "Report received — send to client" : c.jobDoneAt ? "Report awaited from inspector" : "Starts when the job is done",
    owner: "Coordinator", ownerName: p.coordinatorName,
    startDate: c.jobDoneAt, dueDate: reportDue && !c.reportUploadedAt ? { label: "Report due", date: reportDue } : null, completedAt: c.completionEmailSentAt,
    dependencies: ["execution"], blockedReason: null,
    substeps: [
      { id: "request", label: "Report requested (automatic)", status: c.jobDoneAt ? "done" : "pending", note: c.jobDoneAt ? "Next morning 09:00" : undefined },
      { id: "report", label: "Report uploaded", status: c.reportUploadedAt ? "done" : "pending", at: c.reportUploadedAt },
      { id: "mail", label: "Completion email & documents to client", status: c.completionEmailSentAt ? "done" : "pending", at: c.completionEmailSentAt },
      { id: "closed", label: "Project closed", status: p.stage === "Completed" ? "done" : "pending" },
    ],
    actions: [
      ...(c.reportUploadedAt && p.stage !== "Completed" ? ["sendCompletion" as const] : []),
      ...(c.jobDoneAt && p.stage !== "Completed" ? ["uploadReport" as const] : []),
      ...(c.jobDoneAt ? ["sendDocuments" as const] : []),
    ],
    activity: /Report|Completion email/i,
  })

  return finalise([requirement, sourcing, onboarding, execution, closure], cancelled, p.cancelledReason, p.insight.next.owner)
}

/* ───────────────────────── Finance (Accountant) ───────────────────────── */

export function financeTrack({ p, candidates = [], pos = [] }: WorkflowInput): Checkpoint[] {
  const cancelled = p.stage === "Cancelled"
  const b = p.billing
  const inv = b.invoice
  const pay = b.payment
  const po = pos[0]
  const priceTotal = p.priceTotal
  const cur = p.pricing?.currency ?? inv?.currency ?? "INR"
  const cvSent = min(candidates.map((c) => c.cvSentAt))
  const shared = !!cvSent || ["CVs Sent", "Inspector Confirmed", "Job Scheduled", "Completed"].includes(p.stage)

  /* F1 — Client pricing */
  const pricing = cp({
    id: "pricing", track: "finance", title: "Client pricing",
    description: "Accounts sets the price the client pays for this job (rate basis, units, rate). The coordinator cannot send CVs until it is set.",
    status: p.pricing ? "completed" : p.pricingRequestedAt ? "in_progress" : "not_started",
    statusNote: p.pricing ? formatMoney(priceTotal, cur) : p.pricingRequestedAt ? `Requested ${d(p.pricingRequestedAt)}` : "Not requested yet",
    owner: "Accounts", startDate: p.pricingRequestedAt, dueDate: null, completedAt: p.pricing?.setAt ?? null,
    dependencies: [], blockedReason: null,
    substeps: [
      { id: "requested", label: "Price requested by coordinator", status: p.pricingRequestedAt ? "done" : p.pricing ? "skipped" : "pending", at: p.pricingRequestedAt, note: !p.pricingRequestedAt && p.pricing ? "Set without a request" : undefined },
      { id: "set", label: "Client price set", status: p.pricing ? "done" : "pending", at: p.pricing?.setAt, note: p.pricing ? `${formatMoney(priceTotal, cur)} · ${p.pricing.rateBasis}` : undefined },
      { id: "shared", label: "Price shared with client (with CVs)", status: shared ? "done" : "pending", at: cvSent },
    ],
    actions: p.pricing ? [] : ["setPrice"],
    activity: /Client price set/i,
  })

  /* F2 — Purchase order */
  const received = !!po && po.status !== "Awaiting PO"
  const matches = !!po && received && po.amount === priceTotal && po.currency === cur
  // no PO record although the job has finished: the client did not issue one — not something to chase now
  const noPoNeeded = !po && p.stage === "Completed"
  const poStatus: CheckpointStatus = noPoNeeded ? "skipped" : !po ? "not_started" : !received ? "in_progress" : matches ? "completed" : "blocked"
  const purchaseOrder = cp({
    id: "po", track: "finance", title: "Purchase order",
    description: "A PO record opens when the inspector is assigned. Accounts records the client's PO number, date and amount and checks it against the client price.",
    status: poStatus,
    statusNote: noPoNeeded ? "No PO on record" : !po ? "Opens on inspector assignment" : !received ? "Awaiting client PO" : `${po.poNumber}${matches ? "" : " · amount differs"}`,
    owner: received ? "Accounts" : "Client", startDate: null, dueDate: null, completedAt: po?.issueDate ?? null,
    dependencies: ["onboarding"],
    blockedReason: poStatus === "blocked" ? `PO amount ${formatMoney(po!.amount, po!.currency)} differs from the client price ${formatMoney(priceTotal, cur)}` : null,
    substeps: [
      { id: "opened", label: "PO record opened", status: po ? "done" : "pending", note: po ? "On inspector assignment" : undefined },
      { id: "received", label: "Client PO received", status: received ? "done" : "pending", at: po?.issueDate, note: received ? po!.poNumber : undefined },
      { id: "match", label: "PO amount matches client price", status: !received ? "pending" : matches ? "done" : "blocked", note: received ? `${formatMoney(po!.amount, po!.currency)} vs ${formatMoney(priceTotal, cur)}` : undefined },
    ],
    actions: po ? ["recordPO"] : [],
    activity: /PO /,
  })

  /* F3 — Job completion (hand-off from operations) */
  const c = p.completion
  const job = cp({
    id: "job", track: "finance", title: "Job completion",
    description: "Run by the coordinator. Invoicing starts once the completion email has gone to the client.",
    status: p.stage === "Completed" ? "completed" : p.assignedInspectorId ? "in_progress" : "not_started",
    statusNote: p.stage === "Completed" ? `Completed ${d(c.completionEmailSentAt)}` : c.jobDoneAt ? "Job done · report pending" : p.schedule ? `Job ${d(p.schedule.dates[0])}` : p.assignedInspectorId ? "Inspector assigned" : `Job at ${p.stage}`,
    owner: "Coordinator", ownerName: p.coordinatorName, startDate: null, dueDate: p.stage !== "Completed" ? { label: "Needed by", date: p.requiredBy } : null, completedAt: c.completionEmailSentAt,
    dependencies: ["execution", "closure"], blockedReason: null,
    substeps: [
      { id: "assigned", label: "Inspector assigned", status: p.assignedInspectorId ? "done" : "pending", note: p.assignedInspectorName ?? undefined },
      { id: "done", label: "Job done", status: c.jobDoneAt ? "done" : "pending", at: c.jobDoneAt },
      { id: "mail", label: "Completion email sent to client", status: c.completionEmailSentAt ? "done" : "pending", at: c.completionEmailSentAt },
    ],
    actions: [],
    activity: /Assigned |Job done|Completion email/i,
  })

  /* F4 — Invoicing */
  const invoicing = cp({
    id: "invoicing", track: "finance", title: "Invoicing",
    description: "Create the invoice in the accounting system, then record it here with the file. The payment due date follows the client's payment terms.",
    status: inv ? "completed" : b.status === "Invoice Pending" ? "in_progress" : "not_started",
    statusNote: inv ? `${inv.number} · ${formatMoney(inv.total, inv.currency)}` : b.status === "Invoice Pending" ? "Ready to invoice" : "Starts after completion",
    owner: "Accounts", startDate: c.completionEmailSentAt, dueDate: null, completedAt: inv?.date ?? null,
    dependencies: ["job"], blockedReason: null,
    substeps: [
      { id: "ready", label: "Ready to invoice", status: c.completionEmailSentAt ? "done" : "pending", at: c.completionEmailSentAt },
      { id: "uploaded", label: "Invoice uploaded", status: inv ? "done" : "pending", at: inv?.date, note: inv?.number },
      { id: "due", label: "Payment due date set", status: inv ? "done" : "pending", note: inv ? `Due ${d(inv.dueDate)}` : undefined },
    ],
    actions: b.status === "Invoice Pending" ? ["uploadInvoice"] : [],
    activity: /Invoice/i,
  })

  /* F5 — Payment collection */
  const reminders = b.reminders.filter((r) => r.kind === "Reminder")
  const followUps = b.reminders.filter((r) => r.kind === "Follow-up")
  const overdue = !!inv && !pay && days(inv.dueDate) < 0
  const short = !!pay && !!inv && pay.amount < inv.total
  const collection = cp({
    id: "collection", track: "finance", title: "Payment collection",
    description: "Remind the client before the due date, follow up if it passes, and confirm the payment when it arrives.",
    status: b.status === "Paid" ? "completed" : b.status === "Awaiting Payment" ? "in_progress" : "not_started",
    statusNote: pay ? `Paid ${d(pay.date)} · ${pay.method}` : inv ? `${inv.number} · ${overdue ? `${Math.abs(days(inv.dueDate))}d overdue` : `due ${d(inv.dueDate)}`}` : "Starts after invoicing",
    owner: overdue ? "Accounts" : inv && !pay ? "Client" : "Accounts", startDate: inv?.date ?? null, dueDate: inv && !pay ? { label: "Payment due", date: inv.dueDate } : null, completedAt: pay?.date ?? null,
    dependencies: ["invoicing"], blockedReason: null,
    substeps: [
      { id: "reminder", label: "Reminder before due date", status: reminders.length ? "done" : pay ? "skipped" : "pending", at: reminders.at(-1)?.at, note: pay && !reminders.length ? "Paid before a reminder was needed" : undefined },
      { id: "followup", label: "Follow-up after due date", status: followUps.length ? "done" : overdue ? "blocked" : pay || (inv && !overdue) ? "skipped" : "pending", at: followUps.at(-1)?.at, note: overdue && !followUps.length ? "Overdue — follow up" : !overdue && !followUps.length && inv ? "Only if overdue" : undefined },
      { id: "received", label: "Payment received", status: pay ? "done" : "pending", at: pay?.date, note: pay ? `${formatMoney(pay.amount, inv?.currency ?? cur)} · ${pay.reference}` : undefined },
      { id: "matched", label: "Payment matched to invoice", status: !pay ? "pending" : short ? "failed" : "done", note: short ? `Short by ${formatMoney(inv!.total - pay!.amount, inv!.currency)} — check TDS` : undefined },
    ],
    actions: b.status === "Awaiting Payment"
      ? ((overdue ? ["sendPaymentFollowUp", "confirmPayment", "sendPaymentReminder"] : p.billingInsight.next.key === "remind" ? ["sendPaymentReminder", "confirmPayment"] : ["confirmPayment", "sendPaymentReminder"]) as CheckpointActionKey[])
      : [],
    activity: /Payment/i,
  })

  return finalise([pricing, purchaseOrder, job, invoicing, collection], cancelled, p.cancelledReason, p.billingInsight.next.owner)
}

/** cancelled projects: the step that was open becomes "Cancelled", later steps are skipped. The current step takes the real owner. */
function finalise(list: Checkpoint[], cancelled: boolean, reason: string | null, currentOwner: string): Checkpoint[] {
  if (cancelled) {
    let hit = false
    return list.map((c) => {
      if (c.status === "completed") return c
      if (!hit) { hit = true; return { ...c, status: "failed", statusNote: "Project cancelled", blockedReason: reason ?? "Project cancelled", actions: [] } }
      return { ...c, status: "skipped", statusNote: "Not needed", actions: [], substeps: c.substeps.map((s) => (s.status === "done" ? s : { ...s, status: "skipped" as const })) }
    })
  }
  const i = currentIndex(list)
  if (i >= 0 && currentOwner && currentOwner !== "—") list[i] = { ...list[i]!, owner: currentOwner }
  return list
}

/**
 * The checkpoint that needs attention now.
 * Operations run in sequence, so it is the first open step. In the finance track the PO runs in parallel
 * with the job, so the latest open step wins (an overdue payment matters more than a missing PO).
 */
export function currentIndex(list: Checkpoint[]): number {
  const open = (c: Checkpoint) => c.status === "in_progress" || c.status === "blocked" || c.status === "failed"
  const finance = list[0]?.track === "finance"
  const idx = list.map((c, i) => (open(c) ? i : -1)).filter((i) => i >= 0)
  if (idx.length) return finance ? idx[idx.length - 1]! : idx[0]!
  return list.findIndex((c) => c.status === "not_started")
}

export function tracksFor(role: Role): WorkflowTrack[] {
  return role === "Accountant" ? ["finance"] : role === "Coordinator" ? ["operations"] : ["operations", "finance"]
}

export const TRACK_LABEL: Record<WorkflowTrack, string> = { operations: "Operations", finance: "Accounts" }
