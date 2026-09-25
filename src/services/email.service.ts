import { db, newId } from "@/mock/db"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { EmailKind, EmailRecord, EmailTemplate, Role } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

export type EmailDraft = Omit<EmailRecord, "id" | "sentById" | "sentAt" | "status" | "automatic">

/** Synchronous core — workflow steps call this inside their own request. */
export function recordEmail(draft: EmailDraft, notifyRoles: Role[] = []): EmailRecord {
  const smtp = db.integrations.find((i) => i.id === "smtp")
  if (smtp?.state !== "Connected") throw new ApiError("SMTP is not connected. Ask a Super Admin to check Settings → Integrations.", 503)
  if (!draft.to.length) throw new ApiError("Add at least one recipient", 422)
  const rec: EmailRecord = { ...draft, id: newId("eml"), sentById: currentUserId(), sentAt: new Date().toISOString(), status: "Sent", automatic: false }
  db.emails.unshift(rec)
  if (notifyRoles.length) {
    db.notifications.unshift({ id: newId("ntf"), kind: "Email", title: `Email sent — ${draft.subject.slice(0, 60)}`, body: `To ${draft.to.join(", ")}`, link: draft.projectId ? `/projects/${draft.projectId}` : "/emails", read: false, roles: notifyRoles, createdAt: rec.sentAt })
  }
  logActivity("Email", rec.id, draft.projectId, `Sent email "${draft.subject}"`)
  return rec
}

/** Automatic email queued for later (processed by scheduler.ts) */
export function scheduleEmail(draft: Omit<EmailDraft, "cc" | "bcc" | "attachmentIds" | "templateId">, sendAt: string): EmailRecord {
  const rec: EmailRecord = { ...draft, cc: [], bcc: [], attachmentIds: [], templateId: null, id: newId("eml"), sentById: "system", sentAt: sendAt, status: "Scheduled", automatic: true }
  db.emails.unshift(rec)
  return rec
}

export interface EmailRow extends EmailRecord {
  sentByName: string
  projectCode: string | null
  attachmentNames: string[]
  attachments: { id: string; name: string; sizeKb: number; category: string; available: boolean }[]
  projectTitle: string | null
}

function toRow(e: EmailRecord): EmailRow {
  return {
    ...e,
    sentByName: e.sentById === "system" ? "Automatic" : db.users.find((u) => u.id === e.sentById)?.name ?? "—",
    projectCode: db.projects.find((p) => p.id === e.projectId)?.code ?? null,
    attachmentNames: e.attachmentIds.map((id) => db.documents.find((d) => d.id === id)?.name ?? "Removed file"),
    attachments: e.attachmentIds.map((id) => {
      const d = db.documents.find((x) => x.id === id)
      return { id, name: d?.name ?? "Removed file", sizeKb: d?.sizeKb ?? 0, category: d?.category ?? "", available: !!d }
    }),
    projectTitle: db.projects.find((p) => p.id === e.projectId)?.title ?? null,
  }
}

export const emailService = {
  list: (filter: { projectId?: string; kind?: EmailKind } = {}) =>
    request<EmailRow[]>(() =>
      db.emails
        .filter((e) => (!filter.projectId || e.projectId === filter.projectId) && (!filter.kind || e.kind === filter.kind))
        // payment emails are Accounts business — coordinators don't see them
        .filter((e) => !(useSessionStore.getState().user?.role === "Coordinator" && e.kind.startsWith("Payment")))
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .map(toRow),
    ),
  send: (draft: EmailDraft) => request(() => toRow(recordEmail(draft)), { mutate: true }),
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
