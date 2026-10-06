import type {
  ActivityEvent, AppNotification, Candidate, Client, Currency, DocumentFile, EmailRecord, EmailTemplate, Inspector, Integration,
  Organization, Project, ProjectType, PurchaseOrder, Reminder, TimeEntry, User, Vendor, Visit,
} from "@/types/domain"
import * as m from "./seed/masters"
import * as o from "./seed/operations"
import * as c from "./seed/communication"

/** In-memory mock database, persisted to localStorage so demo changes survive a refresh. */
export interface Database {
  users: User[]
  organizations: Organization[]
  currencies: Currency[]
  projectTypes: ProjectType[]
  skills: string[]
  clients: Client[]
  vendors: Vendor[]
  inspectors: Inspector[]
  projects: Project[]
  candidates: Candidate[]
  purchaseOrders: PurchaseOrder[]
  visits: Visit[]
  reminders: Reminder[]
  notifications: AppNotification[]
  documents: DocumentFile[]
  emails: EmailRecord[]
  emailTemplates: EmailTemplate[]
  timeEntries: TimeEntry[]
  activity: ActivityEvent[]
  integrations: Integration[]
  settings: { allowedAdminDomains: string[]; otpExpiryMinutes: number; defaultGstRate: number; paymentReminderDays: number; nearbyRadiusKm: number }
}

export type Collection = {
  [K in keyof Database]: Database[K] extends Array<{ id: string }> ? K : never
}[keyof Database]

const STORAGE_KEY = "praveg-ops-mockdb-v5"

function seed(): Database {
  return structuredClone({
    users: m.users,
    organizations: m.organizations,
    currencies: m.currencies,
    projectTypes: m.projectTypes,
    skills: m.SKILLS,
    clients: m.clients,
    vendors: m.vendors,
    inspectors: m.inspectors,
    projects: o.projects,
    candidates: o.candidates,
    purchaseOrders: o.purchaseOrders,
    visits: o.visits,
    reminders: c.reminders,
    notifications: c.notifications,
    documents: c.documents,
    emails: c.emails,
    emailTemplates: c.emailTemplates,
    timeEntries: c.timeEntries,
    activity: c.activity,
    integrations: c.integrations,
    settings: { allowedAdminDomains: ["praveg.com"], otpExpiryMinutes: 5, defaultGstRate: 18, paymentReminderDays: 7, nearbyRadiusKm: 100 },
  })
}

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Database
      // data saved before the mailbox existed has no inbound mail — add the sample replies
      if (!saved.emails.some((e) => e.direction === "Inbound")) saved.emails.push(...structuredClone(c.inboundEmails))
      return saved
    }
  } catch {
    /* storage unavailable — fall back to seed */
  }
  return seed()
}

export let db: Database = load()

export function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetDatabase(): void {
  db = seed()
  persist()
}

let counter = Date.now() % 100000
export function newId(prefix: string): string {
  counter += 1
  return `${prefix}_${counter.toString(36)}`
}
