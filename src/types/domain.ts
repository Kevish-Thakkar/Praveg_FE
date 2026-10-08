/**
 * Domain model for the Praveg Operations Management Platform (v2: 1 project = 1 job).
 * Derived from the proposal, the client's v2 feedback and docs/ASSUMPTIONS.md (D-1 … D-9).
 * All IDs are strings so the model maps 1:1 to future REST resources.
 *
 * NOTE: reconstructed on 2026-09-25 from how services, seed data and screens use these types
 * (the previous file was lost). Review optionality and union members before a backend contract relies on it.
 */

export type ID = string;
export type ISODate = string; // yyyy-mm-dd
export type ISODateTime = string;

/* ───────────── Geography ───────────── */

/** D-8: India and the UAE only. */
export type Country = "India" | "United Arab Emirates";

/** Geocoded address (mock geocoding in the prototype; Google Places in production — A-5). */
export interface Address {
  line: string;
  city: string;
  state: string;
  country: Country;
  lat: number;
  lng: number;
}

/* ───────────── Access ───────────── */

export type Role = "Super Admin" | "Coordinator" | "Accountant";
export const ROLES: readonly Role[] = [
  "Super Admin",
  "Coordinator",
  "Accountant",
];

export type UserStatus = "Active" | "Invited" | "Disabled";

export interface User {
  id: ID;
  name: string;
  email: string;
  role: Role;
  organizationId: ID;
  phone: string;
  status: UserStatus;
  lastActiveAt: ISODateTime | null;
}

/* ───────────── Masters ───────────── */

export interface Organization {
  id: ID;
  name: string;
  code: string;
  emailDomain: string;
  country: Country;
  city: string;
  status: "Active" | "Inactive";
}

export interface Currency {
  code: string; // ISO 4217
  name: string;
  symbol: string;
  isBase: boolean;
}

export type InspectionCategory = "Inspection" | "Testing" | "Other";

/** A service the client can ask for ("Services" in Settings). */
export interface ProjectType {
  id: ID;
  name: string;
  category: InspectionCategory;
  description: string;
}

export type EmailRecipientRole = "To" | "CC" | "BCC";

export interface ClientContact {
  id: ID;
  name: string;
  email: string;
  jobDescription: string;
  recipientRole: EmailRecipientRole;
}

export interface Client {
  id: ID;
  name: string;
  organizationId: ID;
  currency: string;
  mobile: string;
  email: string;
  address: Address;
  /** due date = invoice date + payment terms (A-13) */
  paymentTermsDays: number;
  contacts: ClientContact[];
  createdAt: ISODateTime;
}

/** Vendors are a separate master (not owned by a client); a project can involve several. */
export interface Vendor {
  id: ID;
  name: string;
  mobile: string;
  email: string;
  address: Address;
  createdAt: ISODateTime;
}

export type EngagementType = "Freelance" | "Supplier-based" | "Outsourced";
export type InspectorStatus = "Available" | "On Assignment" | "Inactive";

export interface Inspector {
  id: ID;
  organizationId: ID;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  address: Address;
  currency: string;
  manDayRate: number;
  lumpSumRate: number;
  hourlyRate: number;
  roundTrip: number;
  engagementType: EngagementType;
  /** D-5: "Disciplines" renamed to Skills */
  skills: string[];
  qualifications: string[];
  status: InspectorStatus;
  createdAt: ISODateTime;
}

/* ───────────── Projects (1 project = 1 job) ───────────── */

/** D-2: six stages, plus Cancelled. See lib/workflow.ts → STAGES */
export type ProjectStage =
  | "Inquiry"
  | "Inspector Assigned"
  | "CVs Sent"
  | "Inspector Confirmed"
  | "Job Scheduled"
  | "Completed"
  | "Cancelled";

export type RateBasis = "Man-Day" | "Lump Sum" | "Hourly";

/** D-4: the client price is set per job by Super Admin / Accountant. */
export interface ClientPricing {
  rateBasis: RateBasis;
  /** days or hours depending on basis (ignored for lump sum) */
  units: number;
  clientRate: number;
  currency: string;
  notes: string;
  setById: ID;
  setAt: ISODateTime;
}

export type SelectionMode = "Direct" | "Interview";
export type InterviewResult = "Pending" | "Passed" | "Failed";

/** A-9: client decision — direct selection or interview first. */
export interface Selection {
  mode: SelectionMode;
  selectedCandidateId: ID | null;
  interviewAt: ISODateTime | null;
  interviewResult: InterviewResult | null;
}

export interface Schedule {
  dates: ISODate[];
  remindersSent: ISODateTime[];
}

export interface ClientComment {
  text: string;
  /** when the client gave the comment */
  at: ISODateTime;
  /** when it was saved here — ordering against completionEmailSentAt uses this */
  recordedAt: ISODateTime;
  /** a reply in the completion email thread, or typed in by the coordinator (phone, WhatsApp, other mail) */
  source: "Email" | "Manual";
  emailId: ID | null;
  recordedById: ID;
}

export interface Completion {
  jobDoneAt: ISODateTime | null;
  reportUploadedAt: ISODateTime | null;
  /** latest time the report / completion email went to the client */
  completionEmailSentAt: ISODateTime | null;
  /** the client's comment on the report; the job closes with it */
  clientComment?: ClientComment | null;
  /** client comments that asked for report changes, oldest first */
  changeRequests?: ClientComment[];
  /** job completed (after the client's comment); older records fall back to completionEmailSentAt */
  closedAt?: ISODateTime | null;
}

export type BillingStatus =
  | "Not Billable"
  | "Invoice Pending"
  | "Awaiting Payment"
  | "Paid";

/** A-12: invoices are created in the accounting system and uploaded with these fields. */
export interface InvoiceDetails {
  number: string;
  date: ISODate;
  jobName: string;
  amount: number;
  taxAmount: number;
  total: number;
  currency: string;
  dueDate: ISODate;
  documentId: ID | null;
  notes: string;
  enteredById: ID;
}

export type PaymentMethod = "Bank Transfer" | "Cheque" | "UPI" | "Wire (SWIFT)";

export interface PaymentDetails {
  amount: number;
  date: ISODate;
  method: PaymentMethod;
  reference: string;
  recordedById: ID;
}

export interface PaymentReminderLog {
  at: ISODateTime;
  kind: "Reminder" | "Follow-up";
}

export interface Billing {
  status: BillingStatus;
  invoice: InvoiceDetails | null;
  payment: PaymentDetails | null;
  reminders: PaymentReminderLog[];
}

export interface Project {
  id: ID;
  code: string;
  title: string;
  clientId: ID;
  /** vendors (manufacturers / fabricators) involved in this job — none, one or several */
  vendorIds: ID[];
  /** → ProjectType */
  serviceId: ID;
  organizationId: ID;
  coordinatorId: ID;
  requiredSkills: string[];
  /** job site — defaults to the vendor / client address (A-6) */
  site: Address;
  description: string;
  requiredBy: ISODate;
  stage: ProjectStage;
  stageChangedAt: ISODateTime;
  pricing: ClientPricing | null;
  pricingRequestedAt: ISODateTime | null;
  selection: Selection | null;
  assignedInspectorId: ID | null;
  schedule: Schedule | null;
  completion: Completion;
  billing: Billing;
  cancelledReason: string | null;
  createdAt: ISODateTime;
}

export type CandidateAvailability = "Requested" | "Available" | "Not Available";
export type CandidateOutcome = "Selected" | "Not Selected";

/** An inspector asked for availability on a project ("Requests & CVs" — D-7). */
export interface Candidate {
  id: ID;
  projectId: ID;
  inspectorId: ID;
  distanceKm: number;
  availability: CandidateAvailability;
  requestedAt: ISODateTime;
  respondedAt: ISODateTime | null;
  cvSentAt: ISODateTime | null;
  outcome: CandidateOutcome | null;
}

/* ───────────── Execution ───────────── */

export type POStatus = "Awaiting PO" | "Received" | "Invoiced" | "Closed";

export interface PurchaseOrder {
  id: ID;
  poNumber: string;
  projectId: ID;
  clientId: ID;
  amount: number;
  currency: string;
  issueDate: ISODate | null;
  status: POStatus;
  notes: string;
}

export type VisitType = "Inspection" | "Follow-up" | "Repair";
export type VisitStatus = "Upcoming" | "Completed" | "Cancelled";

export interface Visit {
  id: ID;
  projectId: ID;
  inspectorId: ID;
  type: VisitType;
  date: ISODate;
  status: VisitStatus;
  unitsSpent: number | null;
  expenses: number | null;
  notes: string;
  completedAt: ISODateTime | null;
  /** earlier dates of this visit, oldest first, with the reason given for each move */
  reschedules?: { from: ISODate; to: ISODate; reason: string; at: ISODateTime; byId: ID }[];
}

export type ReminderType = "Inspector" | "Job" | "Job Date" | "Report" | "Payment";
export type ReminderStatus = "Open" | "Done";

export interface Reminder {
  id: ID;
  type: ReminderType;
  title: string;
  projectId: ID | null;
  inspectorId: ID | null;
  dueDate: ISODate;
  assigneeId: ID;
  status: ReminderStatus;
  createdAt: ISODateTime;
}

export type NotificationKind =
  | "Reminder"
  | "Inspector"
  | "Visit"
  | "Email"
  | "Finance"
  | "System";

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  /** roles that see it; empty = everyone (Super Admin always sees all) */
  roles: Role[];
  createdAt: ISODateTime;
}

/* ───────────── Documents & email ───────────── */

export type DocumentCategory =
  | "CV"
  | "Certificate"
  | "Inspector Confirmation"
  | "Technical Document"
  | "Report"
  | "Out Document"
  | "Purchase Order"
  | "Invoice"
  | "Template"
  | "Other";

export type DocumentEntity = "Project" | "Inspector" | "Client" | "Library";
export type DocumentAccess = "Internal" | "Restricted";

export interface DocumentFile {
  id: ID;
  name: string;
  category: DocumentCategory;
  entityType: DocumentEntity;
  entityId: ID;
  sizeKb: number;
  mimeType: string;
  access: DocumentAccess;
  uploadedById: ID;
  uploadedAt: ISODateTime;
}

export type EmailKind =
  | "Availability Request"
  | "CVs to Client"
  | "Interview"
  | "Inspector Confirmation"
  | "Job Reminder"
  | "Report Request"
  | "Completion"
  | "Payment Reminder"
  | "Payment Follow-up"
  | "General";
export type EmailStatus = "Scheduled" | "Sent" | "Failed" | "Received";
export type EmailDirection = "Outbound" | "Inbound";

export interface EmailRecord {
  id: ID;
  kind: EmailKind;
  projectId: ID | null;
  /** missing on older records = "Outbound" */
  direction?: EmailDirection;
  /** conversation the message belongs to; missing = its own id */
  threadId?: ID;
  /** message this one replies to */
  inReplyTo?: ID | null;
  /** sender address; outbound mail goes from the SMTP sender */
  from?: string;
  /** inbound only: opened by a user */
  read?: boolean;
  subject: string;
  to: string[];
  cc: string[];
  bcc: string[];
  body: string;
  attachmentIds: ID[];
  templateId: ID | null;
  /** "system" for automatic emails */
  sentById: ID;
  /** for Scheduled emails: when it will be sent */
  sentAt: ISODateTime;
  status: EmailStatus;
  /** A-10: queued by the scheduler rather than sent by a user */
  automatic: boolean;
}

export interface EmailTemplate {
  id: ID;
  name: string;
  kind: EmailKind;
  subject: string;
  body: string;
  updatedAt: ISODateTime;
}

/* ───────────── Operations & time (diagram-only — A-19) ───────────── */

export interface TimeEntry {
  id: ID;
  inspectorId: ID;
  projectId: ID;
  date: ISODate;
  hours: number;
  expenseCategory: "Travel" | "Accommodation" | "Per Diem" | "Other" | null;
  expenseAmount: number;
  currency: string;
  status: "Submitted" | "Approved" | "Rejected";
  notes: string;
}

/* ───────────── Audit ───────────── */

export type ActivityEntity =
  | "Project"
  | "Candidate"
  | "Purchase Order"
  | "Visit"
  | "Document"
  | "Email"
  | "Billing"
  | "Client"
  | "Vendor"
  | "Inspector"
  | "User"
  | "Settings";

export interface ActivityEvent {
  id: ID;
  entityType: ActivityEntity;
  entityId: ID;
  projectId: ID | null;
  message: string;
  actorId: ID;
  at: ISODateTime;
}

/* ───────────── Integrations ───────────── */

export type ConnectionState =
  | "Connected"
  | "Not Connected"
  | "Connecting"
  | "Connection Failed";

export interface Integration {
  id: "smtp" | "maps" | "storage" | "otp";
  name: string;
  description: string;
  state: ConnectionState;
  config: Record<string, string>;
  lastCheckedAt: ISODateTime | null;
}
