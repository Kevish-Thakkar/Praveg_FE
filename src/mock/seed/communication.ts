import { dateTimeFromToday as dt, daysFromToday as d } from "@/lib/dates"
import type { ActivityEvent, AppNotification, DocumentFile, EmailRecord, EmailTemplate, Integration, Reminder, TimeEntry } from "@/types/domain"
import { inspectors } from "./masters"

const PDF = "application/pdf"
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const slug = (s: string) => s.replace(/[^A-Za-z]+/g, "_").replace(/^_|_$/g, "")

// v2: every inspector has a CV — it is uploaded in the create form
const cvDocs: DocumentFile[] = inspectors.map((ins, i) => ({
  id: `doc_cv_${ins.id}`, name: `CV_${slug(ins.name)}_2026.pdf`, category: "CV", entityType: "Inspector", entityId: ins.id,
  sizeKb: 180 + ((i * 37) % 260), mimeType: PDF, access: "Restricted", uploadedById: "usr_003", uploadedAt: dt(-200 + i * 7),
}))

const certDocs: DocumentFile[] = inspectors.slice(0, 14).map((ins, i) => ({
  id: `doc_cert_${ins.id}`, name: `${slug(ins.qualifications[0] ?? "Certificate")}_${slug(ins.name)}.pdf`, category: "Certificate", entityType: "Inspector", entityId: ins.id,
  sizeKb: 90 + ((i * 53) % 200), mimeType: PDF, access: "Restricted", uploadedById: "usr_004", uploadedAt: dt(-180 + i * 9),
}))

type DocSeed = [id: string, name: string, category: DocumentFile["category"], entityType: DocumentFile["entityType"], entityId: string, sizeKb: number, off: number, by: string]
const seeds: DocSeed[] = [
  ["doc_001", "R-201_Inspection_Test_Plan_Rev2.pdf", "Technical Document", "Project", "prj_001", 842, -13, "usr_003"],
  ["doc_002", "Inspector_Confirmation_Imran_Shaikh_PRJ-041.pdf", "Inspector Confirmation", "Project", "prj_001", 124, -5, "usr_003"],
  ["doc_014", "PO_KPL-PO-2026-3318.pdf", "Purchase Order", "Project", "prj_001", 210, -6, "usr_006"],
  ["doc_003", "Valve_FAT_Procedure_API598.pdf", "Technical Document", "Project", "prj_004", 720, -3, "usr_003"],
  ["doc_004", "M3_Welding_Map_Rev1.pdf", "Technical Document", "Project", "prj_003", 2310, -6, "usr_007"],
  ["doc_005", "FAT_Report_Firewater_Pumps.pdf", "Report", "Project", "prj_008", 2980, -3, "usr_005"],
  ["doc_006", "Inspection_Report_Coating_AC-310.pdf", "Report", "Project", "prj_010", 1760, -59, "usr_005"],
  ["doc_007", "Inspection_Report_Forged_Fittings.pdf", "Report", "Project", "prj_009", 1980, -54, "usr_003"],
  ["doc_008", "Release_Note_Forged_Fittings.pdf", "Out Document", "Project", "prj_009", 160, -53, "usr_003"],
  ["doc_009", "FAT_Report_HP_Pumps_P-101.pdf", "Report", "Project", "prj_005", 3890, -21, "usr_003"],
  ["doc_010", "Galvanising_Inspection_Report_PR1-4.pdf", "Report", "Project", "prj_011", 1420, -45, "usr_007"],
  ["doc_inv_010", "INV-AE-2026-0142.pdf", "Invoice", "Project", "prj_010", 96, -56, "usr_006"],
  ["doc_inv_009", "INV-IN-2026-0311.pdf", "Invoice", "Project", "prj_009", 102, -50, "usr_006"],
  ["doc_inv_005", "INV-IN-2026-0356.pdf", "Invoice", "Project", "prj_005", 99, -18, "usr_006"],
  ["doc_inv_011", "INV-AE-2026-0131.pdf", "Invoice", "Project", "prj_011", 94, -40, "usr_006"],
  ["doc_016", "Kaveri_Framework_Agreement_2026.pdf", "Other", "Client", "cli_001", 1104, -210, "usr_001"],
  ["doc_018", "Inspection_Report_Template_v4.docx", "Template", "Library", "library", 88, -300, "usr_001"],
  ["doc_019", "Inspector_Confirmation_Template.docx", "Template", "Library", "library", 42, -300, "usr_001"],
]
const opDocs: DocumentFile[] = seeds.map(([id, name, category, entityType, entityId, sizeKb, off, by]) => ({
  id, name, category, entityType, entityId, sizeKb, mimeType: name.endsWith(".docx") ? DOCX : PDF,
  access: category === "Invoice" || category === "Purchase Order" || category === "Other" ? "Restricted" : "Internal", uploadedById: by, uploadedAt: dt(off, 12),
}))

export const documents: DocumentFile[] = [...opDocs, ...cvDocs, ...certDocs]

const sig = "\n\nRegards,\n{{sender.name}}\nPraveg Certification Services"
export const emailTemplates: EmailTemplate[] = [
  { id: "tpl_availability", name: "Availability & confirmation request", kind: "Availability Request", subject: "Availability check — {{project.title}} ({{project.code}})", body: "Dear {{inspector.name}},\n\nWe have an upcoming {{service.name}} job for {{client.name}} at {{site.location}}, required by {{project.requiredBy}}.\n\nRequired skills: {{project.skills}}\n\nPlease confirm your availability and your rate for these dates at the earliest." + sig, updatedAt: dt(-30) },
  { id: "tpl_cvs", name: "CVs to client", kind: "CVs to Client", subject: "Proposed inspectors — {{project.title}} ({{project.code}})", body: "Dear {{client.contactName}},\n\nFurther to your inquiry, please find attached the CVs of the following inspectors who have confirmed availability:\n\n{{inspector.list}}\n\nOur price for this job: {{project.price}}\n\nKindly let us know your selection, or if you would like to interview any of them." + sig, updatedAt: dt(-30) },
  { id: "tpl_interview", name: "Interview invitation", kind: "Interview", subject: "Interview — {{project.code}} on {{interview.at}}", body: "Dear {{inspector.name}},\n\n{{client.name}} would like to interview you for {{project.title}} on {{interview.at}}. Please confirm your attendance." + sig, updatedAt: dt(-30) },
  { id: "tpl_confirm", name: "Inspector assignment confirmation", kind: "Inspector Confirmation", subject: "Assignment confirmed — {{project.code}}", body: "Dear {{inspector.name}},\n\nWe are pleased to confirm your assignment for {{project.title}} at {{vendor.name}}, {{site.location}}.\n\nWe will share the job date(s) and technical documents shortly." + sig, updatedAt: dt(-30) },
  { id: "tpl_job_reminder", name: "Job reminder to inspector", kind: "Job Reminder", subject: "Reminder: {{project.code}} on {{job.dates}}", body: "Dear {{inspector.name}},\n\nThis is a reminder of your job {{project.title}} at {{vendor.name}}, {{site.location}} on {{job.dates}}." + sig, updatedAt: dt(-30) },
  { id: "tpl_report_request", name: "Report upload request", kind: "Report Request", subject: "Please upload your report — {{project.code}}", body: "Dear {{inspector.name}},\n\nThank you for completing {{project.title}}. Please upload / send your inspection report and supporting documents today." + sig, updatedAt: dt(-30) },
  { id: "tpl_completion", name: "Job completion to client", kind: "Completion", subject: "Job completed — {{project.title}} ({{project.code}})", body: "Dear {{client.contactName}},\n\nPlease find attached the inspection report and supporting documents for {{project.title}} carried out on {{job.dates}} by {{inspector.name}}.\n\nKindly confirm the job completion." + sig, updatedAt: dt(-30) },
  { id: "tpl_pay_reminder", name: "Payment reminder (before due date)", kind: "Payment Reminder", subject: "Payment reminder — {{invoice.number}} due {{invoice.dueDate}}", body: "Dear {{client.contactName}},\n\nThis is a friendly reminder that invoice {{invoice.number}} for {{invoice.total}} ({{project.title}}) is due on {{invoice.dueDate}}." + sig, updatedAt: dt(-30) },
  { id: "tpl_pay_followup", name: "Payment follow-up (overdue)", kind: "Payment Follow-up", subject: "Overdue: {{invoice.number}} — {{invoice.total}}", body: "Dear {{client.contactName}},\n\nOur records show that invoice {{invoice.number}} for {{invoice.total}}, due on {{invoice.dueDate}}, is still outstanding. We would appreciate an update on the payment at the earliest." + sig, updatedAt: dt(-30) },
]

type ES = [id: string, kind: EmailRecord["kind"], projectId: string, subject: string, to: string[], off: number, h: number, status: EmailRecord["status"], auto: boolean, attachments?: string[]]
const eSeeds: ES[] = [
  ["eml_001", "Availability Request", "prj_004", "Availability check — Valve FAT — hydro & seat leakage, lot A (PRJ-2026-050)", ["vijay.raghavan@inspector-mail.com", "harpreet.singh.bedi@inspector-mail.com", "sanjay.kulkarni@inspector-mail.com"], -2, 11, "Sent", false],
  ["eml_002", "CVs to Client", "prj_003", "Proposed inspectors — Module M3 — welding & dimensional inspection (PRJ-2026-047)", ["khalid.almansoori@alsafwa-offshore.ae", "supplychain@alsafwa-offshore.ae"], -2, 16, "Sent", false, ["doc_cv_ins_006", "doc_cv_ins_012"]],
  ["eml_003", "CVs to Client", "prj_002", "Proposed inspectors — Tube bundle insertion & pneumatic test (PRJ-2026-044)", ["qa@gulfcrest.ae", "omar.haddad@gulfcrest.ae"], -5, 16, "Sent", false, ["doc_cv_ins_010", "doc_cv_ins_022"]],
  ["eml_004", "Interview", "prj_002", "Interview — PRJ-2026-044", ["ahmed.rashid@inspector-mail.com"], -1, 10, "Sent", false],
  ["eml_005", "Inspector Confirmation", "prj_001", "Assignment confirmed — PRJ-2026-041", ["imran.shaikh@inspector-mail.com"], -5, 12, "Sent", false, ["doc_001"]],
  ["eml_006", "Job Reminder", "prj_001", "Reminder: PRJ-2026-041 tomorrow", ["imran.shaikh@inspector-mail.com"], 0, 9, "Scheduled", true],
  ["eml_007", "Report Request", "prj_012", "Please upload your report — PRJ-2026-052", ["sanjay.kulkarni@inspector-mail.com"], 0, 9, "Scheduled", true],
  ["eml_008", "Completion", "prj_008", "Job completed — Firewater pump sets — FAT (PRJ-2026-060)", ["qa@gulfcrest.ae", "omar.haddad@gulfcrest.ae"], -2, 17, "Sent", false, ["doc_005"]],
  ["eml_009", "Payment Reminder", "prj_009", "Payment reminder — INV-IN-2026-0311", ["procurement@kaveripetrochem.in", "anil.kulkarni@kaveripetrochem.in"], -12, 10, "Sent", false],
  ["eml_010", "Completion", "prj_005", "Job completed — HP pump performance & NPSH test witness (PRJ-2026-053)", ["sourcing@narmadawater.in", "kavita.joshi@narmadawater.in"], -20, 17, "Sent", false, ["doc_009"]],
]
const SENDER = "operations@praveg.com"
const outboundEmails: EmailRecord[] = eSeeds.map(([id, kind, projectId, subject, to, off, h, status, automatic, attachmentIds = []]) => ({
  id, kind, projectId, direction: "Outbound", threadId: id, inReplyTo: null, from: SENDER, subject, to, cc: [], bcc: [], body: "Dear Sir/Madam,\n\nPlease find the details as discussed.\n\nRegards,\nPraveg Certification Services",
  attachmentIds, templateId: null, sentById: automatic ? "system" : "usr_003", sentAt: dt(off, h), status, automatic,
}))

/** Replies received from inspectors and clients, threaded onto the email they answer. */
type IS = [id: string, replyTo: string, from: string, body: string, off: number, h: number, read: boolean]
const inSeeds: IS[] = [
  ["eml_in_001", "eml_001", "vijay.raghavan@inspector-mail.com", "Dear Praveg team,\n\nI am available for the valve FAT on the requested dates. My day rate is as per our last engagement.\n\nPlease share the ITP and the vendor contact.\n\nRegards,\nVijay Raghavan", -1, 14, false],
  ["eml_in_002", "eml_001", "harpreet.singh.bedi@inspector-mail.com", "Hello,\n\nUnfortunately I am on another assignment that week and won't be able to take this job.\n\nThanks,\nHarpreet", -1, 17, true],
  ["eml_in_003", "eml_002", "khalid.almansoori@alsafwa-offshore.ae", "Dear Team,\n\nThank you for the CVs. We would like to proceed with the first candidate. Please send the confirmation and the job schedule.\n\nBest regards,\nKhalid Al Mansoori\nSupplier Quality Lead", -1, 11, false],
  ["eml_in_004", "eml_005", "imran.shaikh@inspector-mail.com", "Thank you for confirming. I will be on site on the job date at 08:00.\n\nCould you please share the latest revision of the ITP?\n\nRegards,\nImran Shaikh", -4, 15, true],
  ["eml_in_005", "eml_009", "anil.kulkarni@kaveripetrochem.in", "Dear Praveg team,\n\nNoted. The invoice has been approved and payment is scheduled in this week's run.\n\nRegards,\nAnil Kulkarni", -11, 12, true],
]
export const inboundEmails: EmailRecord[] = inSeeds.map(([id, replyTo, from, body, off, h, read]) => {
  const parent = outboundEmails.find((e) => e.id === replyTo)!
  return {
    id, kind: parent.kind, projectId: parent.projectId, direction: "Inbound", threadId: parent.id, inReplyTo: parent.id, from, read,
    subject: `Re: ${parent.subject}`, to: [SENDER], cc: [], bcc: [], body, attachmentIds: [], templateId: null,
    sentById: "external", sentAt: dt(off, h), status: "Received", automatic: false,
  }
})

export const emails: EmailRecord[] = [...outboundEmails, ...inboundEmails]

type RS = [id: string, type: Reminder["type"], title: string, projectId: string | null, inspectorId: string | null, off: number, assignee: string, status: Reminder["status"]]
const rSeeds: RS[] = [
  ["rem_001", "Job", "Chase PO from Gulf Crest for PRJ-2026-044", "prj_002", null, 0, "usr_005", "Open"],
  ["rem_002", "Job Date", "Confirm inspector travel for PRJ-2026-041", "prj_001", "ins_021", 0, "usr_003", "Open"],
  ["rem_003", "Job", "Chase replies from 2 inspectors for PRJ-2026-050", "prj_004", null, -1, "usr_003", "Open"],
  ["rem_004", "Inspector", "CSWIP certificate renewal — Harpreet Singh Bedi (expires in 30 days)", null, "ins_002", 7, "usr_003", "Open"],
  ["rem_005", "Report", "Report pending from Sanjay Kulkarni — PRJ-2026-052", "prj_012", "ins_009", 1, "usr_003", "Open"],
  ["rem_006", "Payment", "Follow up overdue invoice INV-IN-2026-0311", "prj_009", null, -2, "usr_006", "Open"],
]
export const reminders: Reminder[] = rSeeds.map(([id, type, title, projectId, inspectorId, off, assigneeId, status]) => ({ id, type, title, projectId, inspectorId, dueDate: d(off), assigneeId, status, createdAt: dt(off - 5) }))

export const notifications: AppNotification[] = [
  { id: "ntf_001", kind: "Reminder", title: "PO still awaited — PRJ-2026-044", body: "Interview is tomorrow and no PO has been recorded.", link: "/projects/prj_002", read: false, roles: ["Coordinator", "Super Admin"], createdAt: dt(0, 8, 30) },
  { id: "ntf_002", kind: "Finance", title: "Price requested — PRJ-2026-050", body: "Karan Patel needs the client price to send CVs to Sahyadri Power.", link: "/projects/prj_004?step=pricing", read: false, roles: ["Accountant", "Super Admin"], createdAt: dt(-1, 15) },
  { id: "ntf_003", kind: "Inspector", title: "Vijay Raghavan is available", body: "Replied to the availability request for PRJ-2026-050.", link: "/projects/prj_004", read: false, roles: ["Coordinator", "Super Admin"], createdAt: dt(-1, 14) },
  { id: "ntf_004", kind: "Finance", title: "Job completed — invoice pending", body: "PRJ-2026-060 Firewater pump FAT is ready to invoice.", link: "/finance", read: false, roles: ["Accountant", "Super Admin"], createdAt: dt(-2, 17) },
  { id: "ntf_005", kind: "Finance", title: "Invoice overdue — INV-IN-2026-0311", body: "Kaveri Petrochem · 5 days overdue. Send a follow-up.", link: "/finance?tab=payments", read: false, roles: ["Accountant", "Super Admin"], createdAt: dt(-1, 9) },
]

export const timeEntries: TimeEntry[] = [
  { id: "te_001", inspectorId: "ins_022", projectId: "prj_008", date: d(-5), hours: 9, expenseCategory: "Travel", expenseAmount: 150, currency: "AED", status: "Approved", notes: "Taxi Sharjah–Hamriyah" },
  { id: "te_002", inspectorId: "ins_022", projectId: "prj_008", date: d(-4), hours: 8, expenseCategory: "Per Diem", expenseAmount: 150, currency: "AED", status: "Submitted", notes: "" },
  { id: "te_003", inspectorId: "ins_009", projectId: "prj_012", date: d(-1), hours: 10, expenseCategory: "Travel", expenseAmount: 3200, currency: "INR", status: "Submitted", notes: "Pune–Hyderabad flight" },
]

type AS = [entityType: ActivityEvent["entityType"], entityId: string, projectId: string | null, message: string, actor: string, off: number, h: number]
const aSeeds: AS[] = [
  ["Project", "prj_006", "prj_006", "Created inquiry PRJ-2026-056 for Desert Wind Energy", "usr_005", 0, 9],
  ["Project", "prj_007", "prj_007", "Created inquiry PRJ-2026-058 for Kaveri Petrochem", "usr_004", -1, 11],
  ["Candidate", "prj_004", "prj_004", "Sent availability requests to 3 inspectors for PRJ-2026-050", "usr_003", -2, 11],
  ["Email", "eml_002", "prj_003", "Sent 2 CVs to Al Safwa Offshore for PRJ-2026-047", "usr_007", -2, 16],
  ["Project", "prj_002", "prj_002", "Client asked to interview Ahmed Rashid — interview booked", "usr_005", -1, 10],
  ["Email", "eml_008", "prj_008", "Completion email sent to Gulf Crest — PRJ-2026-060 completed", "usr_005", -2, 17],
  ["Project", "prj_012", "prj_012", "Marked job done for PRJ-2026-052 — report requested automatically", "usr_003", -1, 18],
  ["Billing", "prj_005", "prj_005", "Invoice INV-IN-2026-0356 uploaded (due in 45 days)", "usr_006", -18, 12],
]
export const activity: ActivityEvent[] = aSeeds.map(([entityType, entityId, projectId, message, actorId, off, h], i) => ({ id: `act_${String(i + 1).padStart(3, "0")}`, entityType, entityId, projectId, message, actorId, at: dt(off, h) }))

export const integrations: Integration[] = [
  { id: "smtp", name: "SMTP email service", description: "Sends availability, CV, confirmation, reminder, completion and payment emails through the client's mail server (§6.8).", state: "Connected", config: { host: "smtp.office365.com", port: "587", security: "STARTTLS", sender: "operations@praveg.com" }, lastCheckedAt: dt(0, 7) },
  { id: "maps", name: "Google Maps Platform", description: "Address search, geocoding and distance for nearby-inspector matching. Prototype uses a keyless map preview and approximate city coordinates.", state: "Not Connected", config: { apiKey: "", services: "Places, Geocoding, Maps JavaScript" }, lastCheckedAt: null },
  { id: "storage", name: "Document storage bucket", description: "Server / cloud bucket storage for CVs, certificates, reports and invoices (§6.9).", state: "Connected", config: { provider: "S3-compatible bucket", bucket: "praveg-ops-documents", region: "ap-south-1 (Mumbai)", encryption: "AES-256 at rest" }, lastCheckedAt: dt(0, 7) },
  { id: "otp", name: "OTP delivery (SMS / email)", description: "Delivers one-time passwords for OTP-based login (§4).", state: "Not Connected", config: { channel: "Email", expiry: "5 minutes" }, lastCheckedAt: null },
]
