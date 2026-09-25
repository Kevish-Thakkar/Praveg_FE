import { db, newId } from "@/mock/db"
import { currentUserId } from "@/store/session.store"
import type { Client, ClientContact, DocumentFile, Inspector, Vendor } from "@/types/domain"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

const orgFor = (country: string) => (country === "India" ? "org_in" : "org_me")

/* ───────────── Clients ───────────── */

export type ClientInput = Omit<Client, "id" | "createdAt" | "contacts" | "organizationId">

export interface ClientRow extends Client {
  vendorCount: number
  projectCount: number
  openProjects: number
}

const clientRow = (c: Client): ClientRow => ({
  ...c,
  vendorCount: db.vendors.filter((v) => v.clientId === c.id).length,
  projectCount: db.projects.filter((p) => p.clientId === c.id).length,
  openProjects: db.projects.filter((p) => p.clientId === c.id && !["Completed", "Cancelled"].includes(p.stage)).length,
})

export const clientService = {
  list: () => request<ClientRow[]>(() => db.clients.map(clientRow)),
  get: (id: string) => request<ClientRow>(() => clientRow(db.clients.find((c) => c.id === id) ?? notFound("Client"))),
  create: (data: ClientInput) =>
    request(() => {
      if (db.clients.some((c) => c.email.toLowerCase() === data.email.toLowerCase())) throw new ApiError("A client with this email already exists", 409)
      const c: Client = { ...data, id: newId("cli"), organizationId: orgFor(data.address.country), contacts: [], createdAt: new Date().toISOString() }
      db.clients.unshift(c)
      logActivity("Client", c.id, null, `Added client ${c.name}`)
      return clientRow(c)
    }, { mutate: true }),
  update: (id: string, data: ClientInput) =>
    request(() => {
      const c = db.clients.find((x) => x.id === id) ?? notFound("Client")
      Object.assign(c, data, { organizationId: orgFor(data.address.country) })
      logActivity("Client", id, null, `Updated client ${c.name}`)
      return clientRow(c)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      if (db.projects.some((p) => p.clientId === id)) throw new ApiError("This client has projects and cannot be deleted", 409)
      db.clients = db.clients.filter((c) => c.id !== id)
      db.vendors = db.vendors.filter((v) => v.clientId !== id)
      return id
    }, { mutate: true }),
  saveContact: (clientId: string, contact: Omit<ClientContact, "id"> & { id?: string }) =>
    request(() => {
      const client = db.clients.find((c) => c.id === clientId) ?? notFound("Client")
      if (contact.id) client.contacts = client.contacts.map((c) => (c.id === contact.id ? { ...c, ...contact, id: c.id } : c))
      else client.contacts.push({ ...contact, id: newId("cc") })
      return clientRow(client)
    }, { mutate: true }),
  removeContact: (clientId: string, contactId: string) =>
    request(() => {
      const client = db.clients.find((c) => c.id === clientId) ?? notFound("Client")
      client.contacts = client.contacts.filter((c) => c.id !== contactId)
      return clientRow(client)
    }, { mutate: true }),
}

/* ───────────── Vendors (belong to a client) ───────────── */

export type VendorInput = Omit<Vendor, "id" | "createdAt">
export interface VendorRow extends Vendor {
  clientName: string
  projectCount: number
}
const vendorRow = (v: Vendor): VendorRow => ({
  ...v,
  clientName: db.clients.find((c) => c.id === v.clientId)?.name ?? "—",
  projectCount: db.projects.filter((p) => p.vendorId === v.id).length,
})

export const vendorService = {
  list: (filter: { clientId?: string } = {}) => request<VendorRow[]>(() => db.vendors.filter((v) => !filter.clientId || v.clientId === filter.clientId).map(vendorRow)),
  create: (data: VendorInput) =>
    request(() => {
      const v: Vendor = { ...data, id: newId("ven"), createdAt: new Date().toISOString() }
      db.vendors.unshift(v)
      logActivity("Vendor", v.id, null, `Added vendor ${v.name} for ${vendorRow(v).clientName}`)
      return vendorRow(v)
    }, { mutate: true }),
  update: (id: string, data: VendorInput) =>
    request(() => {
      const v = db.vendors.find((x) => x.id === id) ?? notFound("Vendor")
      Object.assign(v, data)
      return vendorRow(v)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      if (db.projects.some((p) => p.vendorId === id)) throw new ApiError("This vendor is linked to projects and cannot be deleted", 409)
      db.vendors = db.vendors.filter((v) => v.id !== id)
      return id
    }, { mutate: true }),
}

/* ───────────── Inspectors ───────────── */

export interface InspectorRow extends Inspector {
  hasCv: boolean
  documentCount: number
  activeJobs: number
}

const inspectorRow = (i: Inspector): InspectorRow => {
  const docs = db.documents.filter((d) => d.entityType === "Inspector" && d.entityId === i.id)
  return {
    ...i,
    hasCv: docs.some((d) => d.category === "CV"),
    documentCount: docs.length,
    activeJobs: db.projects.filter((p) => p.assignedInspectorId === i.id && !["Completed", "Cancelled"].includes(p.stage)).length,
  }
}

export type InspectorInput = Omit<Inspector, "id" | "createdAt" | "organizationId">
export interface FileMeta {
  name: string
  sizeKb: number
  mimeType: string
}

function addSkills(skills: string[]) {
  for (const s of skills) if (!db.skills.some((x) => x.toLowerCase() === s.toLowerCase())) db.skills.push(s)
}

export const inspectorService = {
  list: () => request<InspectorRow[]>(() => db.inspectors.map(inspectorRow)),
  get: (id: string) => request<InspectorRow>(() => inspectorRow(db.inspectors.find((x) => x.id === id) ?? notFound("Inspector"))),
  /** v2: the CV is uploaded as part of the create form */
  create: (data: InspectorInput, cv: FileMeta) =>
    request(() => {
      if (!cv?.name) throw new ApiError("Upload the inspector's CV", 422)
      if (db.inspectors.some((i) => i.email.toLowerCase() === data.email.toLowerCase())) throw new ApiError("An inspector with this email already exists", 409)
      const ins: Inspector = { ...data, id: newId("ins"), organizationId: orgFor(data.address.country), createdAt: new Date().toISOString() }
      db.inspectors.unshift(ins)
      addSkills(data.skills)
      const doc: DocumentFile = { id: newId("doc"), name: cv.name, category: "CV", entityType: "Inspector", entityId: ins.id, sizeKb: cv.sizeKb, mimeType: cv.mimeType, access: "Restricted", uploadedById: currentUserId(), uploadedAt: ins.createdAt }
      db.documents.unshift(doc)
      logActivity("Inspector", ins.id, null, `Added inspector ${ins.name} with CV`)
      return inspectorRow(ins)
    }, { mutate: true }),
  update: (id: string, data: InspectorInput, cv?: FileMeta | null) =>
    request(() => {
      const ins = db.inspectors.find((x) => x.id === id) ?? notFound("Inspector")
      Object.assign(ins, data, { organizationId: orgFor(data.address.country) })
      addSkills(data.skills)
      if (cv?.name) {
        db.documents = db.documents.filter((d) => !(d.entityType === "Inspector" && d.entityId === id && d.category === "CV"))
        db.documents.unshift({ id: newId("doc"), name: cv.name, category: "CV", entityType: "Inspector", entityId: id, sizeKb: cv.sizeKb, mimeType: cv.mimeType, access: "Restricted", uploadedById: currentUserId(), uploadedAt: new Date().toISOString() })
      }
      logActivity("Inspector", id, null, `Updated inspector ${ins.name}`)
      return inspectorRow(ins)
    }, { mutate: true }),
  remove: (id: string) =>
    request(() => {
      if (db.candidates.some((c) => c.inspectorId === id)) throw new ApiError("This inspector has been requested on projects and cannot be deleted. Set status to Inactive instead.", 409)
      db.inspectors = db.inspectors.filter((x) => x.id !== id)
      return id
    }, { mutate: true }),
  jobs: (id: string) =>
    request(() =>
      db.candidates
        .filter((c) => c.inspectorId === id)
        .map((c) => {
          const p = db.projects.find((x) => x.id === c.projectId)
          return { candidateId: c.id, projectId: c.projectId, code: p?.code ?? "", title: p?.title ?? "", stage: p?.stage ?? "Inquiry", availability: c.availability, assigned: p?.assignedInspectorId === id, dates: p?.schedule?.dates ?? [] }
        }),
    ),
}
