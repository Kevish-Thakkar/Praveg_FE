import { db, newId } from "@/mock/db"
import { currentUserId, useSessionStore } from "@/store/session.store"
import type { DocumentAccess, DocumentCategory, DocumentEntity, DocumentFile } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

export interface DocumentRow extends DocumentFile {
  uploadedByName: string
  entityLabel: string
  entityLink: string | null
}

function entityInfo(d: DocumentFile): { label: string; link: string | null } {
  switch (d.entityType) {
    case "Project": {
      const p = db.projects.find((x) => x.id === d.entityId)
      return { label: p ? `${p.code} · ${p.title}` : "—", link: p ? `/projects/${p.id}?tab=documents` : null }
    }
    case "Inspector": {
      const i = db.inspectors.find((x) => x.id === d.entityId)
      return { label: i?.name ?? "—", link: i ? `/inspectors/${i.id}` : null }
    }
    case "Client": {
      const c = db.clients.find((x) => x.id === d.entityId)
      return { label: c?.name ?? "—", link: c ? `/clients/${c.id}` : null }
    }
    default:
      return { label: "Template library", link: null }
  }
}

function toRow(d: DocumentFile): DocumentRow {
  const e = entityInfo(d)
  return { ...d, uploadedByName: db.users.find((u) => u.id === d.uploadedById)?.name ?? "—", entityLabel: e.label, entityLink: e.link }
}

export interface UploadInput {
  /** a file's own category overrides the batch category */
  files: { name: string; sizeKb: number; mimeType: string; category?: DocumentCategory }[]
  category: DocumentCategory
  entityType: DocumentEntity
  entityId: string
  access: DocumentAccess
}

export const documentService = {
  list: (filter: { entityType?: DocumentEntity; entityId?: string; category?: DocumentCategory } = {}) =>
    request<DocumentRow[]>(() =>
      db.documents
        .filter((d) =>
          (!filter.entityType || d.entityType === filter.entityType) &&
          (!filter.entityId || d.entityId === filter.entityId) &&
          (!filter.category || d.category === filter.category))
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
        .map(toRow),
    ),
  upload: (input: UploadInput) =>
    request(() => {
      if (!input.files.length) throw new ApiError("Choose at least one file", 422)
      const now = new Date().toISOString()
      const created = input.files.map<DocumentFile>((f) => ({
        id: newId("doc"), name: f.name, category: f.category ?? input.category, entityType: input.entityType, entityId: input.entityId,
        sizeKb: f.sizeKb, mimeType: f.mimeType, access: input.access,
        uploadedById: currentUserId(), uploadedAt: now,
      }))
      db.documents.unshift(...created)
      const projectId = input.entityType === "Project" ? input.entityId : null
      const cats = [...new Set(created.map((d) => d.category.toLowerCase()))]
      logActivity("Document", created[0]!.id, projectId, `Uploaded ${created.length} ${cats.length === 1 ? cats[0] : cats.join(", ")} file(s)`)
      return created.map(toRow)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      const d = db.documents.find((x) => x.id === id) ?? notFound("Document")
      db.documents = db.documents.filter((x) => x.id !== id)
      logActivity("Document", id, null, `Deleted document ${d.name}`)
      return id
    }, { mutate: true }),
  /** §4 controlled document access — returns a short-lived link (mock) */
  requestDownload: (id: string) =>
    request(() => {
      const d = db.documents.find((x) => x.id === id) ?? notFound("Document")
      const role = useSessionStore.getState().user?.role
      if (d.access === "Restricted" && role === "Accountant" && !["Purchase Order", "Invoice"].includes(d.category)) {
        throw new ApiError("You do not have permission to download this document", 403)
      }
      logActivity("Document", id, null, `Downloaded ${d.name}`)
      return { url: `https://storage.example/praveg-ops-documents/${d.id}?expires=300`, expiresInSeconds: 300, name: d.name }
    }),
}
