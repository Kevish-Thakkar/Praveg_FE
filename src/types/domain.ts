/**
 * Domain model for the Praveg Operations Management Platform.
 * Derived from the proposal (sections 3, 6.1 – 6.10) and the user workflow diagram (p.24).
 * All IDs are strings so the model maps 1:1 to future REST resources.
 */

export type ID = string;
export type ISODate = string; // yyyy-mm-dd
export type ISODateTime = string;

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
  country: string;
  city: string;
  status: "Active" | "Inactive";
}

export interface Currency {
  code: string; // ISO 4217
  name: string;
  symbol: string;
  isBase: boolean;
}

export type InspectionCategory = "Inspection" | "Testing";

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
  address: string;
  city: string;
  country: string;
  contacts: ClientContact[];
  createdAt: ISODateTime;
}

export interface Vendor {
  id: ID;
  name: string;
  organizationId: ID;
  mobile: string;
  email: string;
  address: string;
  city: string;
  country: string;
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
  country: string;
  city: string;
  currency: string;
  manDayRate: number;
  lumpSumRate: number;
  hourlyRate: number;
  roundTrip: number;
  engagementType: EngagementType;
  disciplines: string[];
  qualifications: string[];
  status: InspectorStatus;
  createdAt: ISODateTime;
}

/* ───────────── Projects & inspections ───────────── */

/** Derived — never stored. See lib/workflow.ts → deriveProjectStage */
export type ProjectStage =
  | "Enquiry"
  | "Quotation"
  | "Proposal"
  | "Confirmed"
  | "Completed"
  | "Lost";

export interface Project {
  id: ID;
  code: string;
  name: string;
  clientId: ID;
  projectTypeId: ID;
  organizationId: ID;
  coordinatorId: ID;
  vendorIds: ID[];
  description: string;
  startDate: ISODate;
  endDate: ISODate | null;
  createdAt: ISODateTime;
}

export interface Position {
  id: ID;
  projectId: ID;
  code: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
}

export type InspectionStatus =
  | "Draft" // created, requirements captured
  | "Quotation" // inspectors shortlisted / quotations being collected
  | "Proposal" // quotations sent to client, awaiting decision
  | "Won" // client selected main inspector
  | "Lost"
  | "Completed"; // all visits done

export type RateBasis = "Man-Day" | "Lump Sum" | "Hourly";

/** "Inspection Questionnaire" in the workflow diagram — fields to be confirmed with client */
export interface InspectionRequirements {
  discipline: string;
  rateBasis: RateBasis;
  estimatedUnits: number; // days or hours depending on basis (1 for lump sum)
  notes: string;
}

export interface Inspection {
  id: ID;
  code: string;
  projectId: ID;
  positionId: ID | null;
  category: InspectionCategory;
  description: string;
  country: string;
  city: string;
  vendorId: ID;
  inspectionDates: ISODate[];
  status: InspectionStatus;
  requirements: InspectionRequirements;
  mainInspectorId: ID | null;
  backupInspectorId: ID | null;
  lostReason: string | null;
  createdAt: ISODateTime;
}

export type QuotationStatus =
  | "Requested" // asked inspector for quote
  | "Received" // inspector quote received, client price prepared
  | "Sent" // sent to client
  | "Selected" // chosen by client (main)
  | "Backup"
  | "Not Selected";

export interface Quotation {
  id: ID;
  code: string;
  inspectionId: ID;
  inspectorId: ID;
  rateBasis: RateBasis;
  units: number;
  currency: string;
  inspectorRate: number; // cost per unit quoted by inspector
  clientRate: number; // price per unit quoted to client
  roundTrip: number;
  includeCv: boolean;
  status: QuotationStatus;
  notes: string;
  sentAt: ISODateTime | null;
  createdAt: ISODateTime;
}

/* ───────────── Execution ───────────── */

export type POStatus = "Awaiting PO" | "Received" | "Invoiced" | "Closed";

export interface PurchaseOrder {
  id: ID;
  poNumber: string;
  inspectionId: ID;
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
  inspectionId: ID;
  inspectorId: ID;
  type: VisitType;
  date: ISODate;
  status: VisitStatus;
  unitsSpent: number | null;
  expenses: number | null;
  notes: string;
  completedAt: ISODateTime | null;
}

export type ReminderType =
  | "Inspector"
  | "Inspection"
  | "Inspection Date"
  | "Repair Visit"
  | "Follow-up Visit";
export type ReminderStatus = "Open" | "Done";

export interface Reminder {
  id: ID;
  type: ReminderType;
  title: string;
  inspectionId: ID | null;
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
  createdAt: ISODateTime;
}

/* ───────────── Documents & email ───────────── */

export type DocumentCategory =
  | "CV"
  | "Certificate"
  | "Inspector Confirmation"
  | "Technical Document"
  | "Report"
  | "Template"
  | "Purchase Order"
  | "Out Document"
  | "Other";

export type DocumentEntity =
  | "Project"
  | "Inspection"
  | "Inspector"
  | "Client"
  | "Library";
export type DocumentAccess = "Internal" | "Restricted";

export interface DocumentFile {
  id: ID;
  name: string;
  category: DocumentCategory;
  entityType: DocumentEntity;
  entityId: ID;
  /** set for Out Documents: the won inspection date the report belongs to */
  inspectionDate: ISODate | null;
  sizeKb: number;
  mimeType: string;
  access: DocumentAccess;
  uploadedById: ID;
  uploadedAt: ISODateTime;
}

export type EmailKind =
  | "Quotation"
  | "Inspector Confirmation"
  | "Out Document"
  | "Reminder"
  | "General";
export type EmailStatus = "Sent" | "Failed";

export interface EmailRecord {
  id: ID;
  kind: EmailKind;
  inspectionId: ID | null;
  projectId: ID | null;
  inspectionDate: ISODate | null;
  subject: string;
  to: string[];
  cc: string[];
  bcc: string[];
  body: string;
  attachmentIds: ID[];
  templateId: ID | null;
  sentById: ID;
  sentAt: ISODateTime;
  status: EmailStatus;
}

export interface EmailTemplate {
  id: ID;
  name: string;
  kind: EmailKind;
  subject: string;
  body: string;
  updatedAt: ISODateTime;
}

/* ───────────── Finance (diagram-only stages are marked "to be confirmed" in UI) ───────────── */

export type InvoiceKind = "Pre-Invoice" | "Invoice";
export type InvoiceStatus =
  | "Draft"
  | "Issued"
  | "Partially Paid"
  | "Paid"
  | "Cancelled";

export interface Invoice {
  id: ID;
  number: string;
  kind: InvoiceKind;
  clientId: ID;
  projectId: ID;
  poId: ID | null;
  visitIds: ID[];
  currency: string;
  subtotal: number;
  gstApplicable: boolean;
  gstRate: number;
  issueDate: ISODate;
  dueDate: ISODate;
  status: InvoiceStatus;
  convertedFromId: ID | null;
}

export interface Payment {
  id: ID;
  invoiceId: ID;
  amount: number;
  date: ISODate;
  method: "Bank Transfer" | "Cheque" | "UPI" | "Wire (SWIFT)";
  reference: string;
}

export interface TimeEntry {
  id: ID;
  inspectorId: ID;
  inspectionId: ID;
  visitId: ID | null;
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
  | "Inspection"
  | "Quotation"
  | "Purchase Order"
  | "Visit"
  | "Document"
  | "Email"
  | "Client"
  | "Vendor"
  | "Inspector"
  | "Invoice"
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
  id: "smtp" | "storage" | "otp";
  name: string;
  description: string;
  state: ConnectionState;
  config: Record<string, string>;
  lastCheckedAt: ISODateTime | null;
}
