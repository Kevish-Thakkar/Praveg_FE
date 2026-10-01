import { db, newId } from "@/mock/db"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { EmailDirection, EmailKind, EmailRecord, EmailTemplate, Role } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

export type EmailDraft = Omit<EmailRecord, "id" | "sentById" | "sentAt" | "status" | "automatic" | "direction" | "from" | "read">

/** Address outbound mail is sent from (the SMTP integration's sender). */
export const senderAddress = () => db.integrations.find((i) => i.id === "smtp")?.config.sender || "operations@praveg.com"
export const directionOf = (e: EmailRecord): EmailDirection => e.direction ?? "Outbound"
export const threadOf = (e: EmailRecord) => e.threadId ?? e.id
/** Inbound mail queued by the reply simulator hasn't arrived yet. */
const arrived = (e: EmailRecord) => !(directionOf(e) === "Inbound" && e.status === "Scheduled")
const hiddenFromRole = (e: EmailRecord) => useSessionStore.getState().user?.role === "Coordinator" && e.kind.startsWith("Payment")

/** Synchronous core — workflow steps call this inside their own request. */
export function recordEmail(draft: EmailDraft, notifyRoles: Role[] = []): EmailRecord {
  const smtp = db.integrations.find((i) => i.id === "smtp")
  if (smtp?.state !== "Connected") throw new ApiError("SMTP is not connected. Ask a Super Admin to check Settings → Integrations.", 503)
  if (!draft.to.length) throw new ApiError("Add at least one recipient", 422)
  const id = newId("eml")
  const rec: EmailRecord = { ...draft, id, threadId: draft.threadId ?? id, inReplyTo: draft.inReplyTo ?? null, direction: "Outbound", from: senderAddress(), sentById: currentUserId(), sentAt: new Date().toISOString(), status: "Sent", automatic: false }
  db.emails.unshift(rec)
  if (notifyRoles.length) {
    db.notifications.unshift({ id: newId("ntf"), kind: "Email", title: `Email sent — ${draft.subject.slice(0, 60)}`, body: `To ${draft.to.join(", ")}`, link: draft.projectId ? `/projects/${draft.projectId}?tab=emails` : null, read: false, roles: notifyRoles, createdAt: rec.sentAt })
  }
  logActivity("Email", rec.id, draft.projectId, `Sent email "${draft.subject}"`)
  return rec
}

/** Automatic email queued for later (processed by scheduler.ts) */
export function scheduleEmail(draft: Omit<EmailDraft, "cc" | "bcc" | "attachmentIds" | "templateId">, sendAt: string): EmailRecord {
  const id = newId("eml")
  const rec: EmailRecord = { ...draft, cc: [], bcc: [], attachmentIds: [], templateId: null, id, threadId: id, inReplyTo: null, direction: "Outbound", from: senderAddress(), sentById: "system", sentAt: sendAt, status: "Scheduled", automatic: true }
  db.emails.unshift(rec)
  return rec
}

/** Name for an address: user, inspector, client contact or client; otherwise the address itself. */
function nameFor(email: string): string {
  const e = email.toLowerCase()
  if (e === senderAddress().toLowerCase()) return "Praveg Operations"
  const user = db.users.find((u) => u.email.toLowerCase() === e)
  if (user) return user.name
  const ins = db.inspectors.find((i) => i.email.toLowerCase() === e)
  if (ins) return ins.name
  for (const c of db.clients) {
    const contact = c.contacts.find((x) => x.email.toLowerCase() === e)
    if (contact) return contact.name
    if (c.email.toLowerCase() === e) return c.name
  }
  return email
}

/**
 * Prototype stand-in for the incoming mail server: the recipient of a reply answers about a minute later.
 * Production: an IMAP poller / inbound webhook writes received mail into the thread.
 */
function simulateReply(to: EmailRecord) {
  const from = to.to[0]
  if (!from) return
  const name = nameFor(from)
  db.emails.unshift({
    id: newId("eml"), kind: to.kind, projectId: to.projectId, direction: "Inbound", threadId: threadOf(to), inReplyTo: to.id, from, read: false,
    subject: `Re: ${baseSubject(to.subject)}`, to: [senderAddress()], cc: [], bcc: [],
    body: `Dear Praveg team,\n\nThank you for your email — noted. I will come back to you with the details shortly.\n\nRegards,\n${name === from ? "" : name}`.trimEnd(),
    attachmentIds: [], templateId: null, sentById: "external", sentAt: new Date(Date.now() + 45_000).toISOString(), status: "Scheduled", automatic: false,
  })
}

export interface EmailRow extends EmailRecord {
  direction: EmailDirection
  threadId: string
  fromAddress: string
  fromName: string
  /** messages in this email's conversation */
  threadCount: number
  unread: boolean
  sentByName: string
  projectCode: string | null
  attachmentNames: string[]
  attachments: { id: string; name: string; sizeKb: number; category: string; available: boolean }[]
  projectTitle: string | null
}

function toRow(e: EmailRecord): EmailRow {
  const direction = directionOf(e)
  const threadId = threadOf(e)
  const fromAddress = e.from ?? senderAddress()
  return {
    ...e,
    direction,
    threadId,
    fromAddress,
    fromName: nameFor(fromAddress),
    threadCount: db.emails.filter((x) => threadOf(x) === threadId && arrived(x)).length,
    unread: direction === "Inbound" && !e.read,
    sentByName: direction === "Inbound" ? nameFor(fromAddress) : e.sentById === "system" ? "Automatic" : db.users.find((u) => u.id === e.sentById)?.name ?? "—",
    projectCode: db.projects.find((p) => p.id === e.projectId)?.code ?? null,
    attachmentNames: e.attachmentIds.map((id) => db.documents.find((d) => d.id === id)?.name ?? "Removed file"),
    attachments: e.attachmentIds.map((id) => {
      const d = db.documents.find((x) => x.id === id)
      return { id, name: d?.name ?? "Removed file", sizeKb: d?.sizeKb ?? 0, category: d?.category ?? "", available: !!d }
    }),
    projectTitle: db.projects.find((p) => p.id === e.projectId)?.title ?? null,
  }
}

function threadMessages(threadId: string): EmailRecord[] {
  const list = db.emails.filter((e) => threadOf(e) === threadId && arrived(e))
  // payment emails are Accounts business — coordinators don't see them
  if (!list.length || list.some(hiddenFromRole)) notFound("Email")
  return list.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

export type ReplyMode = "reply" | "replyAll" | "forward"

export interface ReplyInput {
  threadId: string
  mode: ReplyMode
  /** message being answered or forwarded; defaults to the latest */
  messageId?: string
  to: string[]
  cc: string[]
  bcc: string[]
  body: string
  attachmentIds: string[]
}

const baseSubject = (s: string) => s.replace(/^((re|fwd?):\s*)+/i, "")

export const emailService = {
  list: (filter: { projectId?: string; kind?: EmailKind } = {}) =>
    request<EmailRow[]>(() =>
      db.emails
        .filter((e) => (!filter.projectId || e.projectId === filter.projectId) && (!filter.kind || e.kind === filter.kind))
        .filter((e) => arrived(e) && !hiddenFromRole(e))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .map(toRow),
    ),
  thread: (threadId: string) => request<EmailRow[]>(() => threadMessages(threadId).map(toRow)),
  markThreadRead: (threadId: string) =>
    request(() => {
      for (const e of threadMessages(threadId)) if (directionOf(e) === "Inbound") e.read = true
      return threadId
    }, { mutate: true }),
  send: (draft: EmailDraft) => request(() => toRow(recordEmail(draft)), { mutate: true }),
  reply: (input: ReplyInput) =>
    request(() => {
      if (!input.body.trim()) throw new ApiError("Write a message before sending", 422)
      const messages = threadMessages(input.threadId)
      const root = messages[0]!
      const target = messages.find((m) => m.id === input.messageId) ?? messages[messages.length - 1]!
      const rec = recordEmail({
        kind: root.kind, projectId: root.projectId, threadId: input.threadId, inReplyTo: target.id,
        subject: `${input.mode === "forward" ? "Fwd" : "Re"}: ${baseSubject(root.subject)}`,
        to: input.to, cc: input.cc, bcc: input.bcc, body: input.body, attachmentIds: input.attachmentIds, templateId: null,
      })
      simulateReply(rec)
      return toRow(rec)
    }, { mutate: true }),
}

export const templateService = {
  list: () => request<EmailTemplate[]>(() => db.emailTemplates),
  update: (id: string, patch: Pick<EmailTemplate, "subject" | "body" | "name">) =>
    request(() => {
      const t = db.emailTemplates.find((x) => x.id === id) ?? notFound("Template")
      Object.assign(t, patch, { updatedAt: new Date().toISOString() })
      logActivity("Settings", id, null, `Updated email template "${t.name}"`)
      return t
    }, { mutate: true }),
}
