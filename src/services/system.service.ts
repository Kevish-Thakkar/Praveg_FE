import { db } from "@/mock/db"
import type { Integration, Role } from "@/types/domain"
import type { SessionUser } from "@/store/session.store"
import { ApiError, notFound, request } from "./api"
import { logActivity } from "./activity.service"

/* ───────────── Authentication (§4: OTP login, domain-restricted Super Admins) ───────────── */

export const DEMO_OTP = "246810"

function findUser(email: string) {
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) throw new ApiError("No account is registered with this email address", 404)
  if (user.status === "Disabled") throw new ApiError("This account has been disabled. Contact your Super Admin.", 403)
  const domain = user.email.split("@")[1]
  if (user.role === "Super Admin" && !db.settings.allowedAdminDomains.includes(domain ?? "")) {
    throw new ApiError("Administrative accounts must sign in with an organization email address", 403)
  }
  return user
}

export const authService = {
  requestOtp: (email: string) =>
    request(() => {
      const user = findUser(email)
      const [name, domain] = user.email.split("@")
      return { maskedEmail: `${name!.slice(0, 2)}${"•".repeat(Math.max(3, name!.length - 2))}@${domain}`, expiresInMinutes: db.settings.otpExpiryMinutes }
    }),
  verifyOtp: (email: string, code: string) =>
    request<SessionUser>(() => {
      const user = findUser(email)
      if (code !== DEMO_OTP) throw new ApiError("The code is incorrect or has expired", 401)
      user.lastActiveAt = new Date().toISOString()
      if (user.status === "Invited") user.status = "Active"
      return { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId }
    }, { mutate: true }),
  /** Demo helper: pick the first active user for a role */
  demoUserFor: (role: Role) =>
    request<SessionUser>(() => {
      const u = db.users.find((x) => x.role === role && x.status === "Active") ?? notFound("User")
      return { id: u.id, name: u.name, email: u.email, role: u.role, organizationId: u.organizationId }
    }),
}

/* ───────────── Integrations (mock states) ───────────── */

export const integrationService = {
  list: () => request<Integration[]>(() => db.integrations),
  saveConfig: (id: Integration["id"], config: Record<string, string>) =>
    request(() => {
      const it = db.integrations.find((i) => i.id === id) ?? notFound("Integration")
      it.config = { ...it.config, ...config }
      it.state = "Not Connected"
      logActivity("Settings", id, null, `Updated ${it.name} configuration`)
      return it
    }, { mutate: true }),
  test: (id: Integration["id"]) =>
    request(() => {
      const it = db.integrations.find((i) => i.id === id) ?? notFound("Integration")
      const missing = Object.entries(it.config).filter(([, v]) => !v.trim())
      it.state = missing.length ? "Connection Failed" : "Connected"
      it.lastCheckedAt = new Date().toISOString()
      return it
    }, { mutate: true }),
  disconnect: (id: Integration["id"]) =>
    request(() => {
      const it = db.integrations.find((i) => i.id === id) ?? notFound("Integration")
      it.state = "Not Connected"
      return it
    }, { mutate: true }),
}

/* ───────────── Reports (diagram step 5 — formats to be confirmed) ───────────── */

export interface ReportDefinition {
  id: string
  name: string
  description: string
  audience: Role[]
}

export const REPORTS: ReportDefinition[] = [
  { id: "rep_pipeline", name: "Project pipeline", description: "Open projects by stage, client, service and coordinator.", audience: ["Super Admin", "Coordinator"] },
  { id: "rep_inspector_util", name: "Inspector utilisation", description: "Jobs, job days and availability replies per inspector.", audience: ["Super Admin", "Coordinator"] },
  { id: "rep_response", name: "Availability response time", description: "Time from availability request to inspector reply.", audience: ["Super Admin", "Coordinator"] },
  { id: "rep_po_status", name: "Purchase order status", description: "POs awaited, received, invoiced and closed.", audience: ["Super Admin", "Accountant"] },
  { id: "rep_revenue", name: "Job revenue & margin", description: "Client price vs inspector rate per completed job.", audience: ["Super Admin", "Accountant"] },
  { id: "rep_receivables", name: "Receivables ageing", description: "Awaiting payments by days to/after due date.", audience: ["Super Admin", "Accountant"] },
]

export const reportService = {
  generate: (reportId: string, format: "PDF" | "Excel" | "CSV") =>
    request(() => {
      const r = REPORTS.find((x) => x.id === reportId) ?? notFound("Report")
      const stamp = new Date().toISOString().slice(0, 10)
      return { fileName: `${r.name.replace(/\W+/g, "_")}_${stamp}.${format === "Excel" ? "xlsx" : format.toLowerCase()}` }
    }),
}

/* ───────────── Global search ───────────── */

export interface SearchHit {
  id: string
  group: "Projects" | "Inspectors" | "Clients" | "Vendors"
  title: string
  subtitle: string
  href: string
}

export const searchService = {
  all: () =>
    request<SearchHit[]>(() => [
      ...db.projects.map((p) => ({ id: p.id, group: "Projects" as const, title: `${p.code} · ${p.title}`, subtitle: `${db.clients.find((c) => c.id === p.clientId)?.name ?? ""} · ${p.stage}`, href: `/projects/${p.id}` })),
      ...db.inspectors.map((i) => ({ id: i.id, group: "Inspectors" as const, title: i.name, subtitle: `${i.skills.slice(0, 3).join(", ")} · ${i.address.city}`, href: `/inspectors/${i.id}` })),
      ...db.clients.map((c) => ({ id: c.id, group: "Clients" as const, title: c.name, subtitle: `${c.address.city}, ${c.address.country}`, href: `/clients/${c.id}` })),
      ...db.vendors.map((v) => ({ id: v.id, group: "Vendors" as const, title: v.name, subtitle: `${db.clients.find((c) => c.id === v.clientId)?.name ?? ""} · ${v.address.city}`, href: `/vendors` })),
    ]),
}
