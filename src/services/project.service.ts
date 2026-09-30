import { db, newId } from "@/mock/db"
import { distanceKm, formatAddress } from "@/constants/geo"
import { describeBilling, describeProject, pricingTotal, STAGES, type BillingInsight, type ProjectInsight } from "@/lib/workflow"
import { useSessionStore } from "@/store/session.store"
import { renderTemplate, type MergeContext } from "@/lib/email-merge"
import { formatDate, toISODate } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import { currentUserId } from "@/store/session.store"
import type { Address, Candidate, ClientPricing, EmailKind, Inspector, Project, ProjectStage, Role } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"
import { recordEmail, scheduleEmail, type EmailDraft } from "./email.service"
import { scheduleAt } from "./scheduler"
import type { FileMeta } from "./party.service"

/* ───────────── Rows ───────────── */

export interface ProjectRow extends Project {
  clientName: string
  /** primary client contact ("To" contact, else first) */
  clientContactName: string | null
  clientContactEmail: string | null
  vendorName: string | null
  serviceName: string
  category: "Inspection" | "Testing"
  coordinatorName: string
  assignedInspectorName: string | null
  candidateCount: number
  availableCount: number
  nearbyCount: number
  priceTotal: number
  insight: ProjectInsight
  /** accounts view of the same project (invoice flow) */
  billingInsight: BillingInsight
  /** Coordinators can't change a project once it is Completed */
  locked: boolean
}

function nearby(site: Address, skills: string[], radius = db.settings.nearbyRadiusKm) {
  return db.inspectors.filter((i) => i.status !== "Inactive" && (skills.length === 0 || skills.some((s) => i.skills.includes(s))) && distanceKm(site, i.address) <= radius)
}

export function toProjectRow(p: Project): ProjectRow {
  const cands = db.candidates.filter((c) => c.projectId === p.id)
  const type = db.projectTypes.find((t) => t.id === p.serviceId)
  const assignedName = db.inspectors.find((i) => i.id === p.assignedInspectorId)?.name ?? null
  const nearbyCount = p.stage === "Inquiry" ? nearby(p.site, p.requiredSkills).length : 0
  const role = useSessionStore.getState().user?.role
  const client = db.clients.find((c) => c.id === p.clientId)
  const contact = client?.contacts.find((c) => c.recipientRole === "To") ?? client?.contacts[0]
  return {
    ...p,
    clientName: client?.name ?? "—",
    clientContactName: contact?.name ?? null,
    clientContactEmail: contact?.email ?? client?.email ?? null,
    vendorName: db.vendors.find((v) => v.id === p.vendorId)?.name ?? null,
    serviceName: type?.name ?? "—",
    category: type?.category ?? "Inspection",
    coordinatorName: db.users.find((u) => u.id === p.coordinatorId)?.name ?? "—",
    assignedInspectorName: assignedName,
    candidateCount: cands.length,
    availableCount: cands.filter((c) => c.availability === "Available").length,
    nearbyCount,
    priceTotal: pricingTotal(p),
    insight: describeProject(p, cands, nearbyCount, assignedName, { hideAccounts: role === "Coordinator" }),
    billingInsight: describeBilling(p, STAGES.find((x) => x.stage === p.stage)?.short ?? p.stage),
    locked: p.stage === "Cancelled" || (p.stage === "Completed" && role === "Coordinator"),
  }
}

const getProject = (id: string) => db.projects.find((p) => p.id === id) ?? notFound("Project")
const setStage = (p: Project, stage: ProjectStage) => {
  p.stage = stage
  p.stageChangedAt = new Date().toISOString()
}
const notify = (title: string, body: string, link: string, roles: Role[], kind: "Inspector" | "Finance" | "Reminder" | "Email" = "Inspector") =>
  db.notifications.unshift({ id: newId("ntf"), kind, title, body, link, read: false, roles, createdAt: new Date().toISOString() })

/* ───────────── Nearby inspector search ───────────── */

export interface InspectorMatch {
  inspector: Inspector
  distanceKm: number
  skillMatch: string[]
  nearby: boolean
  hasCv: boolean
  alreadyRequested: boolean
}

export function matchInspectors(site: Address, skills: string[], opts: { projectId?: string; includeOutside: boolean; query?: string }): InspectorMatch[] {
  const radius = db.settings.nearbyRadiusKm
  const requested = new Set(opts.projectId ? db.candidates.filter((c) => c.projectId === opts.projectId).map((c) => c.inspectorId) : [])
  const q = opts.query?.trim().toLowerCase()
  return db.inspectors
    .filter((i) => i.status !== "Inactive")
    .map((i) => ({
      inspector: i,
      distanceKm: distanceKm(site, i.address),
      skillMatch: skills.filter((s) => i.skills.includes(s)),
      nearby: distanceKm(site, i.address) <= radius,
      hasCv: db.documents.some((d) => d.entityType === "Inspector" && d.entityId === i.id && d.category === "CV"),
      alreadyRequested: requested.has(i.id),
    }))
    .filter((m) => (skills.length === 0 || m.skillMatch.length > 0) && (opts.includeOutside || m.nearby))
    .filter((m) => !q || `${m.inspector.name} ${m.inspector.address.city} ${m.inspector.skills.join(" ")}`.toLowerCase().includes(q))
    .sort((a, b) => b.skillMatch.length - a.skillMatch.length || a.distanceKm - b.distanceKm)
}

/* ───────────── Email context & presets ───────────── */

function contextFor(p: Project, extra: { inspector?: Inspector | null; inspectors?: Inspector[] } = {}): MergeContext {
  const client = db.clients.find((c) => c.id === p.clientId)
  const vendor = db.vendors.find((v) => v.id === p.vendorId)
  const primary = client?.contacts.find((c) => c.recipientRole === "To") ?? client?.contacts[0]
  const me = db.users.find((u) => u.id === currentUserId())
  const insp = extra.inspector ?? db.inspectors.find((i) => i.id === p.assignedInspectorId) ?? null
  const inv = p.billing.invoice
  return {
    "client.name": client?.name ?? "",
    "client.contactName": primary?.name ?? "Sir/Madam",
    "project.title": p.title,
    "project.code": p.code,
    "project.requiredBy": formatDate(p.requiredBy),
    "project.skills": p.requiredSkills.join(", "),
    "project.price": p.pricing ? `${formatMoney(pricingTotal(p), p.pricing.currency)} (${p.pricing.rateBasis === "Lump Sum" ? "lump sum" : `${formatMoney(p.pricing.clientRate, p.pricing.currency)} × ${p.pricing.units} ${p.pricing.rateBasis === "Man-Day" ? "man-days" : "hours"}`})` : "to be advised",
    "service.name": db.projectTypes.find((t) => t.id === p.serviceId)?.name ?? "",
    "site.location": `${p.site.city}, ${p.site.state}`,
    "vendor.name": vendor?.name ?? client?.name ?? "",
    "inspector.name": insp?.name ?? "Inspector",
    "inspector.list": (extra.inspectors ?? []).map((i) => `• ${i.name} — ${i.qualifications.join(", ")} (${i.address.city})`).join("\n"),
    "interview.at": p.selection?.interviewAt ? new Date(p.selection.interviewAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "",
    "job.dates": (p.schedule?.dates ?? []).map((d) => formatDate(d)).join(", ") || "to be advised",
    "invoice.number": inv?.number ?? "",
    "invoice.total": inv ? formatMoney(inv.total, inv.currency) : "",
    "invoice.dueDate": inv ? formatDate(inv.dueDate) : "",
    "sender.name": me?.name ?? "Praveg Certification Services",
  }
}

function templateEmail(kind: EmailKind, ctx: MergeContext) {
  const t = db.emailTemplates.find((x) => x.kind === kind)
  return { subject: renderTemplate(t?.subject ?? kind, ctx), body: renderTemplate(t?.body ?? "", ctx), templateId: t?.id ?? null }
}

function clientRecipients(clientId: string) {
  const c = db.clients.find((x) => x.id === clientId)
  const contacts = c?.contacts ?? []
  const pick = (r: "To" | "CC" | "BCC") => contacts.filter((x) => x.recipientRole === r).map((x) => x.email)
  const to = [...new Set([c?.email ?? "", ...pick("To")].filter(Boolean))]
  return {
    to,
    cc: pick("CC").filter((e) => !to.includes(e)),
    bcc: pick("BCC").filter((e) => !to.includes(e)),
    suggestions: [...(c?.email ? [{ email: c.email, name: `${c.name} (main)` }] : []), ...contacts.map((x) => ({ email: x.email, name: x.name }))],
  }
}

export interface PresetDocument { id: string; name: string; category: string; sizeKb: number; group: string; suggested: boolean }

export interface EmailPreset {
  kind: EmailKind
  context: MergeContext
  defaults: { to: string[]; cc: string[]; bcc: string[]; templateId: string; attachmentIds: string[] }
  /** every document the user may attach; the ones suited to this email are flagged `suggested` and pre-selected */
  documents: PresetDocument[]
  suggestions: { email: string; name: string }[]
}

/** Client-facing emails open in the composer pre-filled from this preset. */
function preset(projectId: string, kind: EmailKind, candidateIds: string[] = []): EmailPreset {
  const p = getProject(projectId)
  const role = useSessionStore.getState().user?.role
  const cands = db.candidates.filter((c) => candidateIds.includes(c.id))
  const insps = cands.map((c) => db.inspectors.find((i) => i.id === c.inspectorId)!).filter(Boolean)
  const ctx = contextFor(p, { inspectors: insps })
  const r = clientRecipients(p.clientId)
  const projectInspectorIds = new Set(db.candidates.filter((c) => c.projectId === p.id).map((c) => c.inspectorId))
  const cvs = db.documents.filter((d) => d.category === "CV" && insps.some((i) => i.id === d.entityId))
  const allProject = db.documents.filter((d) => d.entityType === "Project" && d.entityId === p.id && (role !== "Coordinator" || d.category !== "Invoice"))
  const projectDocs = allProject.filter((d) => d.category !== "Invoice" && d.category !== "Purchase Order")
  const invoiceDocs = allProject.filter((d) => d.category === "Invoice")
  const tpl = db.emailTemplates.find((t) => t.kind === kind)
  // what this kind of email normally carries (pre-selected)
  const suggestedDocs = kind === "CVs to Client" ? [...cvs, ...projectDocs.filter((d) => d.category === "Technical Document")] : kind.startsWith("Payment") ? invoiceDocs : projectDocs
  const attachmentIds = kind === "CVs to Client" ? cvs.map((d) => d.id) : kind === "Completion" ? projectDocs.filter((d) => d.category === "Report" || d.category === "Out Document").map((d) => d.id) : kind.startsWith("Payment") ? invoiceDocs.map((d) => d.id) : []
  // everything else that can be attached
  const inspectorCvs = db.documents.filter((d) => (d.category === "CV" || d.category === "Certificate") && d.entityType === "Inspector" && projectInspectorIds.has(d.entityId))
  const clientDocs = db.documents.filter((d) => d.entityType === "Client" && d.entityId === p.clientId)
  const library = db.documents.filter((d) => d.entityType === "Library")
  const groupOf = (d: (typeof db.documents)[number]) => d.entityType === "Project" ? "Project documents" : d.entityType === "Inspector" ? "Inspector CVs & certificates" : d.entityType === "Client" ? "Client documents" : "Template library"
  const suggested = new Set(suggestedDocs.map((d) => d.id))
  const seen = new Set<string>()
  const documents: PresetDocument[] = []
  for (const d of [...suggestedDocs, ...allProject, ...inspectorCvs, ...clientDocs, ...library]) {
    if (seen.has(d.id)) continue
    seen.add(d.id)
    const insp = d.entityType === "Inspector" ? db.inspectors.find((i) => i.id === d.entityId)?.name : null
    documents.push({ id: d.id, name: insp ? `${d.name} — ${insp}` : d.name, category: d.category, sizeKb: d.sizeKb, group: groupOf(d), suggested: suggested.has(d.id) })
  }
  return {
    kind, context: ctx, suggestions: r.suggestions,
    defaults: { to: r.to, cc: r.cc, bcc: r.bcc, templateId: tpl?.id ?? "", attachmentIds },
    documents,
  }
}

/** Inspector-facing emails are generated from templates in one click. */
function mailInspector(p: Project, inspector: Inspector, kind: EmailKind) {
  const e = templateEmail(kind, contextFor(p, { inspector }))
  return recordEmail({ kind, projectId: p.id, to: [inspector.email], cc: [], bcc: [], attachmentIds: [], ...e })
}

/* ───────────── Project CRUD ───────────── */

export type ProjectInput = Pick<Project, "title" | "clientId" | "vendorId" | "serviceId" | "requiredSkills" | "site" | "description" | "requiredBy" | "coordinatorId">

function nextCode(): string {
  const max = db.projects.reduce((m, p) => Math.max(m, Number(p.code.split("-").pop()) || 0), 0)
  return `PRJ-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`
}

function requestAvailabilityCore(p: Project, inspectorIds: string[]) {
  const existing = new Set(db.candidates.filter((c) => c.projectId === p.id).map((c) => c.inspectorId))
  const added: Candidate[] = []
  for (const id of inspectorIds.filter((x) => !existing.has(x))) {
    const ins = db.inspectors.find((i) => i.id === id) ?? notFound("Inspector")
    const c: Candidate = { id: newId("cnd"), projectId: p.id, inspectorId: id, distanceKm: distanceKm(p.site, ins.address), availability: "Requested", requestedAt: new Date().toISOString(), respondedAt: null, cvSentAt: null, outcome: null }
    db.candidates.push(c)
    added.push(c)
    mailInspector(p, ins, "Availability Request")
  }
  if (added.length && (p.stage === "Inquiry" || p.stage === "CVs Sent")) setStage(p, "Inspector Assigned")
  logActivity("Candidate", p.id, p.id, `Sent availability & confirmation requests to ${added.length} inspector(s)`)
  return added.length
}

export const projectService = {
  list: () => request<ProjectRow[]>(() => db.projects.map(toProjectRow)),
  get: (id: string) => request<ProjectRow>(() => toProjectRow(getProject(id))),
  create: (input: ProjectInput, requestInspectorIds: string[] = []) =>
    request(() => {
      const client = db.clients.find((c) => c.id === input.clientId) ?? notFound("Client")
      if (input.vendorId && db.vendors.find((v) => v.id === input.vendorId)?.clientId !== client.id) throw new ApiError("The vendor does not belong to this client", 422)
      const now = new Date().toISOString()
      const p: Project = {
        ...input, id: newId("prj"), code: nextCode(), organizationId: input.site.country === "India" ? "org_in" : "org_me", stage: "Inquiry", stageChangedAt: now,
        pricing: null, pricingRequestedAt: null, selection: null, assignedInspectorId: null, schedule: null,
        completion: { jobDoneAt: null, reportUploadedAt: null, completionEmailSentAt: null }, billing: { status: "Not Billable", invoice: null, payment: null, reminders: [] }, cancelledReason: null, createdAt: now,
      }
      db.projects.unshift(p)
      logActivity("Project", p.id, p.id, `Created inquiry ${p.code} for ${client.name}`)
      if (requestInspectorIds.length) requestAvailabilityCore(p, requestInspectorIds)
      return toProjectRow(p)
    }, { mutate: true }),
  update: (id: string, patch: ProjectInput) =>
    request(() => {
      const p = getProject(id)
      if (p.stage === "Completed" && useSessionStore.getState().user?.role === "Coordinator") throw new ApiError("Completed projects can't be edited by coordinators", 403)
      Object.assign(p, patch)
      logActivity("Project", id, id, "Updated project details")
      return toProjectRow(p)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      const p = getProject(id)
      if (p.stage !== "Inquiry") throw new ApiError("Only inquiries without inspector requests can be deleted — cancel the project instead", 409)
      db.projects = db.projects.filter((x) => x.id !== id)
      return id
    }, { mutate: true }),
  cancel: (id: string, reason: string) =>
    request(() => {
      const p = getProject(id)
      if (!reason.trim()) throw new ApiError("Give a reason", 422)
      if (p.stage === "Completed") throw new ApiError("Completed projects cannot be cancelled", 409)
      setStage(p, "Cancelled")
      p.cancelledReason = reason
      logActivity("Project", id, id, `Cancelled ${p.code}: ${reason}`)
      return toProjectRow(p)
    }, { mutate: true }),

  /* matching */
  matches: (input: { site: Address; skills: string[]; projectId?: string; includeOutside: boolean; query?: string }) =>
    request(() => matchInspectors(input.site, input.skills, input)),
  candidates: (projectId: string) =>
    request(() =>
      db.candidates
        .filter((c) => c.projectId === projectId)
        .map((c) => {
          const i = db.inspectors.find((x) => x.id === c.inspectorId)!
          return { ...c, inspector: i, hasCv: db.documents.some((d) => d.entityType === "Inspector" && d.entityId === i.id && d.category === "CV") }
        })
        .sort((a, b) => a.distanceKm - b.distanceKm),
    ),
  /** all availability requests across projects (Inspector requests & CVs page) */
  allCandidates: () =>
    request(() =>
      db.candidates
        .map((c) => {
          const p = db.projects.find((x) => x.id === c.projectId)
          const i = db.inspectors.find((x) => x.id === c.inspectorId)
          return { ...c, inspectorName: i?.name ?? "—", inspectorCity: i?.address.city ?? "", projectCode: p?.code ?? "—", projectTitle: p?.title ?? "", clientName: db.clients.find((x) => x.id === p?.clientId)?.name ?? "—", stage: p?.stage ?? "Inquiry", coordinatorId: p?.coordinatorId ?? "" }
        })
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    ),
  emailPreset: (projectId: string, kind: EmailKind, candidateIds: string[] = []) => request(() => preset(projectId, kind, candidateIds)),

  /* Step 2 — availability & confirmation */
  requestAvailability: (projectId: string, inspectorIds: string[]) =>
    request(() => {
      const p = getProject(projectId)
      if (!["Inquiry", "Inspector Assigned", "CVs Sent"].includes(p.stage)) throw new ApiError("Inspectors can only be requested before one is confirmed", 409)
      if (!inspectorIds.length) throw new ApiError("Select at least one inspector", 422)
      return requestAvailabilityCore(p, inspectorIds)
    }, { mutate: true }),
  recordAvailability: (candidateId: string, availability: "Available" | "Not Available") =>
    request(() => {
      const c = db.candidates.find((x) => x.id === candidateId) ?? notFound("Request")
      c.availability = availability
      c.respondedAt = new Date().toISOString()
      const p = getProject(c.projectId)
      const name = db.inspectors.find((i) => i.id === c.inspectorId)?.name
      logActivity("Candidate", p.id, p.id, `${name} is ${availability.toLowerCase()} for ${p.code}`)
      return c
    }, { mutate: true }),
  removeCandidate: (candidateId: string) =>
    request(() => {
      const c = db.candidates.find((x) => x.id === candidateId) ?? notFound("Request")
      if (c.cvSentAt) throw new ApiError("This inspector's CV has already been sent to the client", 409)
      db.candidates = db.candidates.filter((x) => x.id !== candidateId)
      return candidateId
    }, { mutate: true }),

  /* Pricing — Super Admin / Accountant */
  requestPricing: (projectId: string) =>
    request(() => {
      const p = getProject(projectId)
      p.pricingRequestedAt = new Date().toISOString()
      notify(`Price requested — ${p.code}`, `${db.users.find((u) => u.id === currentUserId())?.name} needs the client price for ${p.title}.`, `/projects/${p.id}?step=pricing`, ["Accountant", "Super Admin"], "Finance")
      return true
    }, { mutate: true }),
  setPricing: (projectId: string, pricing: Omit<ClientPricing, "setById" | "setAt">) =>
    request(() => {
      const p = getProject(projectId)
      if (pricing.clientRate <= 0 || pricing.units <= 0) throw new ApiError("Rate and units must be greater than zero", 422)
      p.pricing = { ...pricing, setById: currentUserId(), setAt: new Date().toISOString() }
      notify(`Client price set — ${p.code}`, `${formatMoney(pricingTotal(p), pricing.currency)}. CVs can now be sent to the client.`, `/projects/${p.id}`, ["Coordinator", "Super Admin"], "Finance")
      logActivity("Project", p.id, p.id, `Client price set: ${formatMoney(pricingTotal(p), pricing.currency)}`)
      return toProjectRow(p)
    }, { mutate: true }),

  /* Step 3 — CVs to client */
  sendCvs: (projectId: string, candidateIds: string[], email: EmailDraft) =>
    request(() => {
      const p = getProject(projectId)
      if (!p.pricing) throw new ApiError("The client price must be set by Accounts before sending CVs", 409)
      const cs = db.candidates.filter((c) => candidateIds.includes(c.id))
      if (!cs.length || cs.some((c) => c.availability !== "Available")) throw new ApiError("Select inspectors who confirmed availability", 422)
      recordEmail(email)
      const now = new Date().toISOString()
      cs.forEach((c) => (c.cvSentAt = now))
      setStage(p, "CVs Sent")
      logActivity("Email", p.id, p.id, `Sent ${cs.length} CV(s) and price to the client`)
      return toProjectRow(p)
    }, { mutate: true }),

  /* Step 4 — client decision: interview or direct selection */
  recordDecision: (projectId: string, d: { mode: "Direct"; candidateId: string } | { mode: "Interview"; candidateId: string; interviewAt: string }) =>
    request(() => {
      const p = getProject(projectId)
      if (p.stage !== "CVs Sent") throw new ApiError("Send CVs to the client first", 409)
      const c = db.candidates.find((x) => x.id === d.candidateId && x.projectId === projectId) ?? notFound("Inspector")
      const ins = db.inspectors.find((i) => i.id === c.inspectorId)!
      p.selection = { mode: d.mode, selectedCandidateId: c.id, interviewAt: d.mode === "Interview" ? d.interviewAt : null, interviewResult: d.mode === "Interview" ? "Pending" : null }
      setStage(p, "Inspector Confirmed")
      if (d.mode === "Interview") mailInspector(p, ins, "Interview")
      logActivity("Project", p.id, p.id, d.mode === "Interview" ? `Client wants to interview ${ins.name}` : `Client selected ${ins.name} directly`)
      return toProjectRow(p)
    }, { mutate: true }),
  recordInterview: (projectId: string, result: "Passed" | "Failed") =>
    request(() => {
      const p = getProject(projectId)
      if (!p.selection || p.selection.mode !== "Interview") throw new ApiError("No interview is scheduled", 409)
      p.selection.interviewResult = result
      if (result === "Failed") {
        const c = db.candidates.find((x) => x.id === p.selection!.selectedCandidateId)
        if (c) c.outcome = "Not Selected"
        p.selection = null
        setStage(p, "CVs Sent")
      }
      logActivity("Project", p.id, p.id, `Interview ${result.toLowerCase()}`)
      return toProjectRow(p)
    }, { mutate: true }),
  assignInspector: (projectId: string) =>
    request(() => {
      const p = getProject(projectId)
      const s = p.selection
      if (!s?.selectedCandidateId) throw new ApiError("Record the client's selection first", 409)
      if (s.mode === "Interview" && s.interviewResult !== "Passed") throw new ApiError("The interview must be passed first", 409)
      const c = db.candidates.find((x) => x.id === s.selectedCandidateId)!
      db.candidates.filter((x) => x.projectId === projectId).forEach((x) => (x.outcome = x.id === c.id ? "Selected" : x.cvSentAt ? "Not Selected" : x.outcome))
      p.assignedInspectorId = c.inspectorId
      const ins = db.inspectors.find((i) => i.id === c.inspectorId)!
      mailInspector(p, ins, "Inspector Confirmation")
      if (!db.purchaseOrders.some((po) => po.projectId === p.id)) {
        db.purchaseOrders.unshift({ id: newId("po"), poNumber: "", projectId: p.id, clientId: p.clientId, amount: pricingTotal(p), currency: p.pricing?.currency ?? "INR", issueDate: null, status: "Awaiting PO", notes: "" })
      }
      logActivity("Project", p.id, p.id, `Assigned ${ins.name} — confirmation email sent`)
      return toProjectRow(p)
    }, { mutate: true }),

  /* Step 5 — schedule, reminders */
  scheduleJob: (projectId: string, dates: string[]) =>
    request(() => {
      const p = getProject(projectId)
      if (!p.assignedInspectorId) throw new ApiError("Assign the inspector first", 409)
      if (!dates.length) throw new ApiError("Pick at least one job date", 422)
      const sorted = [...dates].sort()
      p.schedule = { dates: sorted, remindersSent: p.schedule?.remindersSent ?? [] }
      setStage(p, "Job Scheduled")
      db.visits = db.visits.filter((v) => !(v.projectId === p.id && v.status === "Upcoming"))
      sorted.forEach((date) => db.visits.push({ id: newId("vis"), projectId: p.id, inspectorId: p.assignedInspectorId!, type: "Inspection", date, status: "Upcoming", unitsSpent: null, expenses: null, notes: "", completedAt: null }))
      // automatic reminder 1 day before the first job date
      db.emails = db.emails.filter((e) => !(e.projectId === p.id && e.kind === "Job Reminder" && e.status === "Scheduled"))
      const ins = db.inspectors.find((i) => i.id === p.assignedInspectorId)!
      const before = new Date(`${sorted[0]}T00:00:00`)
      before.setDate(before.getDate() - 1)
      const e = templateEmail("Job Reminder", contextFor(p, { inspector: ins }))
      scheduleEmail({ kind: "Job Reminder", projectId: p.id, to: [ins.email], subject: e.subject, body: e.body }, scheduleAt(toISODate(before)))
      logActivity("Project", p.id, p.id, `Job scheduled for ${sorted.map((x) => formatDate(x)).join(", ")} — automatic reminder set`)
      return toProjectRow(p)
    }, { mutate: true }),
  sendJobReminder: (projectId: string) =>
    request(() => {
      const p = getProject(projectId)
      const ins = db.inspectors.find((i) => i.id === p.assignedInspectorId) ?? notFound("Inspector")
      mailInspector(p, ins, "Job Reminder")
      p.schedule?.remindersSent.push(new Date().toISOString())
      return toProjectRow(p)
    }, { mutate: true }),

  /* Step 5 → 6 — job done, report, completion */
  markJobDone: (projectId: string) =>
    request(() => {
      const p = getProject(projectId)
      if (p.stage !== "Job Scheduled") throw new ApiError("The job is not scheduled", 409)
      const now = new Date()
      p.completion.jobDoneAt = now.toISOString()
      db.visits.filter((v) => v.projectId === p.id && v.status === "Upcoming").forEach((v) => Object.assign(v, { status: "Completed", completedAt: now.toISOString(), unitsSpent: v.unitsSpent ?? 1 }))
      const ins = db.inspectors.find((i) => i.id === p.assignedInspectorId)!
      const next = new Date(now)
      next.setDate(next.getDate() + 1)
      const e = templateEmail("Report Request", contextFor(p, { inspector: ins }))
      scheduleEmail({ kind: "Report Request", projectId: p.id, to: [ins.email], subject: e.subject, body: e.body }, scheduleAt(toISODate(next)))
      logActivity("Project", p.id, p.id, "Job done — report request scheduled for tomorrow 09:00")
      return toProjectRow(p)
    }, { mutate: true }),
  uploadReport: (projectId: string, files: FileMeta[]) =>
    request(() => {
      const p = getProject(projectId)
      if (!p.completion.jobDoneAt) throw new ApiError("Mark the job as done first", 409)
      if (!files.length) throw new ApiError("Choose the report file(s)", 422)
      const now = new Date().toISOString()
      files.forEach((f, i) => db.documents.unshift({ id: newId("doc"), name: f.name, category: i === 0 ? "Report" : "Out Document", entityType: "Project", entityId: p.id, sizeKb: f.sizeKb, mimeType: f.mimeType, access: "Internal", uploadedById: currentUserId(), uploadedAt: now }))
      p.completion.reportUploadedAt = now
      logActivity("Document", p.id, p.id, `Report uploaded (${files.length} file(s))`)
      return toProjectRow(p)
    }, { mutate: true }),
  sendCompletion: (projectId: string, email: EmailDraft) =>
    request(() => {
      const p = getProject(projectId)
      if (!p.completion.reportUploadedAt) throw new ApiError("Upload the report first", 409)
      recordEmail(email)
      p.completion.completionEmailSentAt = new Date().toISOString()
      setStage(p, "Completed")
      p.billing.status = "Invoice Pending"
      notify(`Job completed — invoice pending`, `${p.code} ${p.title} is ready to invoice.`, "/finance", ["Accountant", "Super Admin"], "Finance")
      logActivity("Project", p.id, p.id, `Completion email sent — ${p.code} completed`)
      return toProjectRow(p)
    }, { mutate: true }),
}

export { formatAddress }
