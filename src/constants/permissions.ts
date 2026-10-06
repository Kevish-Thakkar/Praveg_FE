import type { Role } from "@/types/domain"

/**
 * Role-permission matrix (v2: three roles).
 *  - Coordinator: runs operations — clients, vendors, inspectors, projects and the job workflow;
 *    can also set the client price and create / record the client's PO.
 *  - Accountant: sets the client price per job, invoices, payment follow-up.
 *  - Super Admin: everything, including configuration.
 * Still a draft: the proposal says the final matrix is confirmed with Praveg (§3, §9).
 */

export type Module =
  | "dashboard"
  | "projects"
  | "pricing"
  | "candidates"
  | "purchaseOrders"
  | "visits"
  | "calendar"
  | "reminders"
  | "documents"
  | "outDocuments"
  | "emails"
  | "clients"
  | "vendors"
  | "inspectors"
  | "billing"
  | "operations"
  | "reports"
  | "settings"
  | "users"
  | "organizations"

export type Action = "view" | "create" | "edit" | "delete"

export const MODULE_LABELS: Record<Module, string> = {
  dashboard: "Dashboard",
  projects: "Projects & job workflow",
  pricing: "Client price per job",
  candidates: "Inspector requests & CVs",
  purchaseOrders: "Purchase Orders",
  visits: "Visits",
  calendar: "Calendar",
  reminders: "Reminders",
  documents: "Documents",
  outDocuments: "Out Documents",
  emails: "Emails",
  clients: "Clients & Contacts",
  vendors: "Vendors",
  inspectors: "Inspectors (CVs, rates)",
  billing: "Invoicing & payments",
  operations: "Operations & Time",
  reports: "Reports",
  settings: "Configuration",
  users: "Users & Roles",
  organizations: "Organizations",
}

type Matrix = Record<Role, Partial<Record<Module, readonly Action[]>>>

const ALL: readonly Action[] = ["view", "create", "edit", "delete"]
const VCE: readonly Action[] = ["view", "create", "edit"]
const VC: readonly Action[] = ["view", "create"]
const V: readonly Action[] = ["view"]

const allModules = Object.keys(MODULE_LABELS) as Module[]

export const PERMISSIONS: Matrix = {
  "Super Admin": Object.fromEntries(allModules.map((m) => [m, ALL])),
  Coordinator: {
    dashboard: V,
    projects: ALL,
    pricing: VCE,
    candidates: VCE,
    purchaseOrders: VCE,
    visits: VCE,
    calendar: V,
    reminders: ALL,
    documents: VCE,
    outDocuments: VC,
    emails: VC,
    clients: ALL,
    vendors: ALL,
    inspectors: ALL,
    operations: VC,
    reports: V,
  },
  Accountant: {
    dashboard: V,
    projects: V,
    pricing: VCE,
    candidates: V,
    purchaseOrders: ALL,
    visits: V,
    calendar: V,
    reminders: V,
    documents: V,
    emails: VC,
    clients: V,
    billing: ALL,
    operations: ["view", "edit"],
    reports: V,
  },
}

export function can(role: Role, module: Module, action: Action = "view"): boolean {
  return PERMISSIONS[role]?.[module]?.includes(action) ?? false
}
