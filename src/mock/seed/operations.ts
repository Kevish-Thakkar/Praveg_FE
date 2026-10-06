import { dateTimeFromToday as dt, daysFromToday as d } from "@/lib/dates"
import { distanceKm } from "@/constants/geo"
import type { Billing, Candidate, ClientPricing, Completion, Project, ProjectStage, PurchaseOrder, Selection, Visit } from "@/types/domain"
import { addr, inspectors } from "./masters"

const noCompletion: Completion = { jobDoneAt: null, reportUploadedAt: null, completionEmailSentAt: null }
const notBillable: Billing = { status: "Not Billable", invoice: null, payment: null, reminders: [] }
const price = (clientRate: number, units: number, currency: string, off: number, by = "usr_006"): ClientPricing => ({ rateBasis: "Man-Day", units, clientRate, currency, notes: "", setById: by, setAt: dt(off, 12) })

interface P extends Partial<Project> {
  id: string
  code: string
  title: string
  clientId: string
  vendorIds: string[]
  serviceId: string
  requiredSkills: string[]
  site: Project["site"]
  stage: ProjectStage
  created: number
}

function project(p: P): Project {
  const { created, ...rest } = p
  return {
    description: "",
    organizationId: p.site.country === "India" ? "org_in" : "org_me",
    coordinatorId: p.site.country === "India" ? "usr_002" : "usr_005",
    requiredBy: d(created + 14),
    stageChangedAt: dt(created, 10),
    pricing: null,
    pricingRequestedAt: null,
    selection: null,
    assignedInspectorId: null,
    schedule: null,
    completion: noCompletion,
    billing: notBillable,
    cancelledReason: null,
    createdAt: dt(created, 10),
    ...rest,
  }
}

const sel = (mode: Selection["mode"], selectedCandidateId: string | null, interviewAt: string | null = null, interviewResult: Selection["interviewResult"] = null): Selection => ({ mode, selectedCandidateId, interviewAt, interviewResult })

export const projects: Project[] = [
  // 1 — Inquiry (new, nothing sent yet)
  project({ id: "prj_006", code: "PRJ-2026-056", title: "Pre-shipment inspection — LSAW pipe lot 1", clientId: "cli_006", vendorIds: ["ven_007"], serviceId: "pt_psi", requiredSkills: ["Piping"], site: addr("Al Hamra Industrial Zone, Plot 21", "Ras Al Khaimah"), stage: "Inquiry", created: 0, description: "Dimensional, marking and packing checks on 2,400 m of 60\" LSAW pipe before dispatch." }),
  project({ id: "prj_007", code: "PRJ-2026-058", title: "Crude unit spools — RT / UT examination", clientId: "cli_001", vendorIds: ["ven_008", "ven_001"], serviceId: "pt_ndt", requiredSkills: ["NDT", "Piping"], site: addr("GIDC Ankleshwar Road, Plot 88", "Bharuch"), stage: "Inquiry", created: -1, coordinatorId: "usr_004", description: "Radiography and ultrasonic testing of 610 CS piping spools." }),
  // 2 — Inspector Assigned (availability requested, waiting for replies; price requested)
  project({ id: "prj_004", code: "PRJ-2026-050", title: "Valve FAT — hydro & seat leakage, lot A", clientId: "cli_004", vendorIds: ["ven_003"], serviceId: "pt_fat", requiredSkills: ["Valves"], site: addr("IDA Pashamylaram, Phase III", "Hyderabad"), stage: "Inspector Assigned", created: -3, stageChangedAt: dt(-2, 11), pricingRequestedAt: dt(-1, 15), description: "API 598 shell and seat tests on 142 gate & globe valves; 10% random witness." }),
  // 3 — CVs Sent (waiting client decision)
  project({ id: "prj_003", code: "PRJ-2026-047", title: "Module M3 — welding & dimensional inspection", clientId: "cli_003", vendorIds: ["ven_005"], serviceId: "pt_tpi", requiredSkills: ["Structural Steel", "Welding"], site: addr("JAFZA North, Plot N-3007", "Jebel Ali"), stage: "CVs Sent", created: -6, stageChangedAt: dt(-2, 16), pricing: price(2750, 3, "AED", -3), coordinatorId: "usr_007" }),
  // 4 — Inspector Confirmed (interview booked)
  project({ id: "prj_002", code: "PRJ-2026-044", title: "Tube bundle insertion & pneumatic test — E-301 A/B", clientId: "cli_002", vendorIds: ["ven_006"], serviceId: "pt_vs", requiredSkills: ["Heat Exchangers"], site: addr("Hamriyah Free Zone, Plot HD-04", "Sharjah"), stage: "Inspector Confirmed", created: -9, stageChangedAt: dt(-1, 10), pricing: price(2650, 2, "AED", -7), selection: sel("Interview", "cnd_021", dt(1, 11), "Pending") }),
  // 5 — Job Scheduled (tomorrow; auto reminder today)
  project({ id: "prj_001", code: "PRJ-2026-041", title: "Reactor R-201 — final inspection & hydrotest", clientId: "cli_001", vendorIds: ["ven_002"], serviceId: "pt_tpi", requiredSkills: ["Pressure Vessels", "Welding"], site: addr("Hazira Industrial Area, Plot 7", "Hazira"), stage: "Job Scheduled", created: -14, stageChangedAt: dt(-4, 12), pricing: price(22000, 2, "INR", -12), selection: sel("Direct", "cnd_101"), assignedInspectorId: "ins_021", schedule: { dates: [d(1), d(2)], remindersSent: [] }, requiredBy: d(3), description: "Hydrotest at 1.3× design pressure; PWHT chart and weld-overlay records review." }),
  // 5b — Job done yesterday; report requested automatically
  project({ id: "prj_012", code: "PRJ-2026-052", title: "Control valve stroke, leakage & positioner test", clientId: "cli_004", vendorIds: ["ven_003"], serviceId: "pt_fat", requiredSkills: ["Valves", "Instrumentation"], site: addr("IDA Pashamylaram, Phase III", "Hyderabad"), stage: "Job Scheduled", created: -16, stageChangedAt: dt(-6, 12), pricing: price(18500, 1, "INR", -13), selection: sel("Interview", "cnd_121", dt(-9, 15), "Passed"), assignedInspectorId: "ins_009", schedule: { dates: [d(-1)], remindersSent: [dt(-3, 10)] }, completion: { jobDoneAt: dt(-1, 18), reportUploadedAt: null, completionEmailSentAt: null }, requiredBy: d(0) }),
  // 6 — Completed, invoice pending
  project({ id: "prj_008", code: "PRJ-2026-060", title: "Firewater pump sets — FAT", clientId: "cli_002", vendorIds: ["ven_006"], serviceId: "pt_fat", requiredSkills: ["Rotating Equipment"], site: addr("Hamriyah Free Zone, Plot HD-04", "Sharjah"), stage: "Completed", created: -25, stageChangedAt: dt(-2, 17), pricing: price(2300, 2, "AED", -22), selection: sel("Direct", "cnd_081"), assignedInspectorId: "ins_022", schedule: { dates: [d(-5), d(-4)], remindersSent: [] }, completion: { jobDoneAt: dt(-4, 18), reportUploadedAt: dt(-3, 14), completionEmailSentAt: dt(-2, 17) }, billing: { status: "Invoice Pending", invoice: null, payment: null, reminders: [] } }),
  // 6 — Completed, awaiting payment, due soon (reminder suggestion)
  project({ id: "prj_010", code: "PRJ-2026-039", title: "Air cooler bays — coating inspection", clientId: "cli_002", vendorIds: ["ven_006"], serviceId: "pt_tpi", requiredSkills: ["Coating"], site: addr("Hamriyah Free Zone, Plot HD-04", "Sharjah"), stage: "Completed", created: -75, stageChangedAt: dt(-58, 17), pricing: price(2050, 3, "AED", -72), selection: sel("Direct", "cnd_111"), assignedInspectorId: "ins_011", schedule: { dates: [d(-62), d(-61), d(-60)], remindersSent: [] }, completion: { jobDoneAt: dt(-60, 18), reportUploadedAt: dt(-59, 12), completionEmailSentAt: dt(-58, 17) }, billing: { status: "Awaiting Payment", invoice: { number: "INV-AE-2026-0142", date: d(-56), jobName: "Air cooler bays — coating inspection", amount: 6150, taxAmount: 307.5, total: 6457.5, currency: "AED", dueDate: d(4), documentId: "doc_inv_010", notes: "", enteredById: "usr_006" }, payment: null, reminders: [] } }),
  // 6 — Completed, overdue (follow-up)
  project({ id: "prj_009", code: "PRJ-2026-038", title: "Forged fittings — dimensional check & MTC review", clientId: "cli_001", vendorIds: ["ven_001"], serviceId: "pt_tpi", requiredSkills: ["Forgings"], site: addr("GIDC Metoda, Plot G-1432", "Rajkot"), stage: "Completed", created: -70, stageChangedAt: dt(-52, 17), pricing: price(16500, 2, "INR", -66), selection: sel("Direct", "cnd_091"), assignedInspectorId: "ins_016", schedule: { dates: [d(-56)], remindersSent: [dt(-57, 10)] }, completion: { jobDoneAt: dt(-56, 18), reportUploadedAt: dt(-54, 11), completionEmailSentAt: dt(-52, 17) }, billing: { status: "Awaiting Payment", invoice: { number: "INV-IN-2026-0311", date: d(-50), jobName: "Forged fittings — dimensional check & MTC review", amount: 33000, taxAmount: 5940, total: 38940, currency: "INR", dueDate: d(-5), documentId: "doc_inv_009", notes: "", enteredById: "usr_006" }, payment: null, reminders: [{ at: dt(-12, 10), kind: "Reminder" }] } }),
  // 6 — Completed, awaiting payment, far due
  project({ id: "prj_005", code: "PRJ-2026-053", title: "HP pump performance & NPSH test witness", clientId: "cli_005", vendorIds: ["ven_004"], serviceId: "pt_fat", requiredSkills: ["Rotating Equipment"], site: addr("Phase IV, GIDC Naroda", "Ahmedabad"), stage: "Completed", created: -35, stageChangedAt: dt(-20, 17), pricing: price(21000, 3, "INR", -32), selection: sel("Interview", "cnd_051", dt(-30, 11), "Passed"), assignedInspectorId: "ins_019", schedule: { dates: [d(-24), d(-23), d(-22)], remindersSent: [] }, completion: { jobDoneAt: dt(-22, 18), reportUploadedAt: dt(-21, 15), completionEmailSentAt: dt(-20, 17) }, billing: { status: "Awaiting Payment", invoice: { number: "INV-IN-2026-0356", date: d(-18), jobName: "HP pump performance & NPSH test witness", amount: 63000, taxAmount: 11340, total: 74340, currency: "INR", dueDate: d(27), documentId: "doc_inv_005", notes: "", enteredById: "usr_006" }, payment: null, reminders: [] } }),
  // 6 — Completed & paid
  project({ id: "prj_011", code: "PRJ-2026-036", title: "Pipe racks PR-1 to PR-4 — galvanising check", clientId: "cli_003", vendorIds: ["ven_005"], serviceId: "pt_tpi", requiredSkills: ["Structural Steel", "Coating"], site: addr("JAFZA North, Plot N-3007", "Jebel Ali"), stage: "Completed", created: -60, stageChangedAt: dt(-44, 17), pricing: price(2750, 2, "AED", -57, "usr_001"), selection: sel("Direct", "cnd_131"), assignedInspectorId: "ins_006", schedule: { dates: [d(-47), d(-46)], remindersSent: [] }, completion: { jobDoneAt: dt(-46, 18), reportUploadedAt: dt(-45, 12), completionEmailSentAt: dt(-44, 17) }, coordinatorId: "usr_007", billing: { status: "Paid", invoice: { number: "INV-AE-2026-0131", date: d(-40), jobName: "Pipe racks PR-1 to PR-4 — galvanising check", amount: 5500, taxAmount: 275, total: 5775, currency: "AED", dueDate: d(-10), documentId: "doc_inv_011", notes: "", enteredById: "usr_006" }, payment: { amount: 5775, date: d(-12), method: "Bank Transfer", reference: "FAB/TT/2609771", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_013", code: "PRJ-2026-021", title: "Storage tank T-4 — shell & bottom inspection", clientId: "cli_001", vendorIds: ["ven_008"], serviceId: "pt_tpi", requiredSkills: ["Storage Tanks"], site: addr("GIDC Ankleshwar Road, Plot 88", "Bharuch"), stage: "Completed", created: -162, stageChangedAt: dt(-148, 17), pricing: price(19500, 3, "INR", -160), selection: sel("Direct", null), assignedInspectorId: "ins_020", schedule: { dates: [d(-151), d(-150)], remindersSent: [] }, completion: { jobDoneAt: dt(-150, 18), reportUploadedAt: dt(-149, 12), completionEmailSentAt: dt(-148, 17) }, billing: { status: "Paid", invoice: { number: "INV-IN-2026-0188", date: d(-146), jobName: "Storage tank T-4 — shell & bottom inspection", amount: 58500, taxAmount: 10530.0, total: 69030.0, currency: "INR", dueDate: d(-101), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 69030.0, date: d(-110), method: "Bank Transfer", reference: "UTR110388", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_014", code: "PRJ-2026-024", title: "Boiler feed pump — FAT witness", clientId: "cli_005", vendorIds: ["ven_004"], serviceId: "pt_fat", requiredSkills: ["Rotating Equipment"], site: addr("Phase IV, GIDC Naroda", "Ahmedabad"), stage: "Completed", created: -132, stageChangedAt: dt(-118, 17), pricing: price(21000, 2, "INR", -130), selection: sel("Direct", null), assignedInspectorId: "ins_019", schedule: { dates: [d(-121), d(-120)], remindersSent: [] }, completion: { jobDoneAt: dt(-120, 18), reportUploadedAt: dt(-119, 12), completionEmailSentAt: dt(-118, 17) }, billing: { status: "Paid", invoice: { number: "INV-IN-2026-0214", date: d(-116), jobName: "Boiler feed pump — FAT witness", amount: 42000, taxAmount: 7560.0, total: 49560.0, currency: "INR", dueDate: d(-71), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 49560.0, date: d(-80), method: "Bank Transfer", reference: "UTR80288", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_015", code: "PRJ-2026-027", title: "Gate valves lot B — hydro test", clientId: "cli_004", vendorIds: ["ven_003"], serviceId: "pt_fat", requiredSkills: ["Valves"], site: addr("IDA Pashamylaram, Phase III", "Hyderabad"), stage: "Completed", created: -107, stageChangedAt: dt(-93, 17), pricing: price(18500, 4, "INR", -105), selection: sel("Direct", null), assignedInspectorId: "ins_013", schedule: { dates: [d(-96), d(-95)], remindersSent: [] }, completion: { jobDoneAt: dt(-95, 18), reportUploadedAt: dt(-94, 12), completionEmailSentAt: dt(-93, 17) }, billing: { status: "Paid", invoice: { number: "INV-IN-2026-0247", date: d(-90), jobName: "Gate valves lot B — hydro test", amount: 74000, taxAmount: 13320.0, total: 87320.0, currency: "INR", dueDate: d(-45), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 87320.0, date: d(-45), method: "Bank Transfer", reference: "UTR45488", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_016", code: "PRJ-2026-022", title: "Wellhead spools — dimensional & weld check", clientId: "cli_003", vendorIds: ["ven_005"], serviceId: "pt_tpi", requiredSkills: ["Welding", "Piping"], site: addr("JAFZA North, Plot N-3007", "Jebel Ali"), stage: "Completed", created: -152, stageChangedAt: dt(-138, 17), pricing: price(2750, 3, "AED", -150), selection: sel("Direct", null), assignedInspectorId: "ins_006", schedule: { dates: [d(-141), d(-140)], remindersSent: [] }, completion: { jobDoneAt: dt(-140, 18), reportUploadedAt: dt(-139, 12), completionEmailSentAt: dt(-138, 17) }, billing: { status: "Paid", invoice: { number: "INV-AE-2026-0098", date: d(-136), jobName: "Wellhead spools — dimensional & weld check", amount: 8250, taxAmount: 412.5, total: 8662.5, currency: "AED", dueDate: d(-91), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 8662.5, date: d(-100), method: "Bank Transfer", reference: "UTR100388", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_017", code: "PRJ-2026-025", title: "Heat exchanger E-210 — pneumatic test", clientId: "cli_002", vendorIds: ["ven_006"], serviceId: "pt_vs", requiredSkills: ["Heat Exchangers"], site: addr("Hamriyah Free Zone, Plot HD-04", "Sharjah"), stage: "Completed", created: -122, stageChangedAt: dt(-108, 17), pricing: price(2650, 2, "AED", -120), selection: sel("Direct", null), assignedInspectorId: "ins_022", schedule: { dates: [d(-111), d(-110)], remindersSent: [] }, completion: { jobDoneAt: dt(-110, 18), reportUploadedAt: dt(-109, 12), completionEmailSentAt: dt(-108, 17) }, billing: { status: "Paid", invoice: { number: "INV-AE-2026-0109", date: d(-105), jobName: "Heat exchanger E-210 — pneumatic test", amount: 5300, taxAmount: 265.0, total: 5565.0, currency: "AED", dueDate: d(-60), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 5565.0, date: d(-62), method: "Bank Transfer", reference: "UTR62288", recordedById: "usr_006" }, reminders: [] } }),
  project({ id: "prj_018", code: "PRJ-2026-029", title: "Turbine skid — coating & final inspection", clientId: "cli_006", vendorIds: ["ven_007"], serviceId: "pt_tpi", requiredSkills: ["Coating"], site: addr("Al Hamra Industrial Zone, Plot 21", "Ras Al Khaimah"), stage: "Completed", created: -92, stageChangedAt: dt(-78, 17), pricing: price(2400, 4, "AED", -90), selection: sel("Direct", null), assignedInspectorId: "ins_011", schedule: { dates: [d(-81), d(-80)], remindersSent: [] }, completion: { jobDoneAt: dt(-80, 18), reportUploadedAt: dt(-79, 12), completionEmailSentAt: dt(-78, 17) }, billing: { status: "Paid", invoice: { number: "INV-AE-2026-0121", date: d(-76), jobName: "Turbine skid — coating & final inspection", amount: 9600, taxAmount: 480.0, total: 10080.0, currency: "AED", dueDate: d(-31), documentId: null, notes: "", enteredById: "usr_006" }, payment: { amount: 10080.0, date: d(-30), method: "Bank Transfer", reference: "UTR30488", recordedById: "usr_006" }, reminders: [] } }),
]

type CSeed = [id: string, projectId: string, inspectorId: string, availability: Candidate["availability"], reqOff: number, respOff: number | null, cvOff: number | null, outcome: Candidate["outcome"]]
const cSeeds: CSeed[] = [
  ["cnd_041", "prj_004", "ins_013", "Available", -2, -1, null, null],
  ["cnd_042", "prj_004", "ins_002", "Requested", -2, null, null, null],
  ["cnd_043", "prj_004", "ins_009", "Requested", -2, null, null, null],
  ["cnd_031", "prj_003", "ins_006", "Available", -5, -4, -2, null],
  ["cnd_032", "prj_003", "ins_012", "Available", -5, -4, -2, null],
  ["cnd_033", "prj_003", "ins_018", "Not Available", -5, -4, null, null],
  ["cnd_021", "prj_002", "ins_010", "Available", -8, -7, -5, null],
  ["cnd_022", "prj_002", "ins_022", "Available", -8, -7, -5, null],
  ["cnd_023", "prj_002", "ins_003", "Not Available", -8, -7, null, null],
  ["cnd_101", "prj_001", "ins_021", "Available", -12, -11, -9, "Selected"],
  ["cnd_102", "prj_001", "ins_020", "Available", -12, -11, -9, "Not Selected"],
  ["cnd_103", "prj_001", "ins_001", "Not Available", -12, -12, null, null],
  ["cnd_121", "prj_012", "ins_009", "Available", -15, -14, -12, "Selected"],
  ["cnd_122", "prj_012", "ins_013", "Available", -15, -14, -12, "Not Selected"],
  ["cnd_081", "prj_008", "ins_022", "Available", -24, -23, -21, "Selected"],
  ["cnd_082", "prj_008", "ins_003", "Available", -24, -23, -21, "Not Selected"],
  ["cnd_111", "prj_010", "ins_011", "Available", -74, -73, -71, "Selected"],
  ["cnd_091", "prj_009", "ins_016", "Available", -69, -68, -66, "Selected"],
  ["cnd_051", "prj_005", "ins_019", "Available", -34, -33, -31, "Selected"],
  ["cnd_052", "prj_005", "ins_008", "Available", -34, -33, -31, "Not Selected"],
  ["cnd_131", "prj_011", "ins_006", "Available", -59, -58, -57, "Selected"],
]

export const candidates: Candidate[] = cSeeds.map(([id, projectId, inspectorId, availability, req, resp, cv, outcome]) => {
  const p = projects.find((x) => x.id === projectId)!
  const i = inspectors.find((x) => x.id === inspectorId)!
  return { id, projectId, inspectorId, distanceKm: distanceKm(p.site, i.address), availability, requestedAt: dt(req, 10), respondedAt: resp === null ? null : dt(resp, 14), cvSentAt: cv === null ? null : dt(cv, 16), outcome }
})

const total = (p: Project) => (p.pricing ? p.pricing.clientRate * p.pricing.units : 0)
type POSeed = [id: string, poNumber: string, projectId: string, status: PurchaseOrder["status"], off: number | null]
const poSeeds: POSeed[] = [
  ["po_001", "KPL/PO/2026/3318", "prj_001", "Received", -6],
  ["po_002", "", "prj_002", "Awaiting PO", null],
  ["po_005", "NWIL/PO/26/0412", "prj_005", "Invoiced", -28],
  ["po_008", "GCE-PO-26-0907", "prj_008", "Received", -12],
  ["po_009", "KPL/PO/2026/3342", "prj_009", "Invoiced", -60],
  ["po_010", "GCE-PO-26-0741", "prj_010", "Invoiced", -66],
  ["po_011", "ASO-4500128731", "prj_011", "Closed", -55],
  ["po_012", "SPPL/QA/PO/0917", "prj_012", "Received", -10],
]
export const purchaseOrders: PurchaseOrder[] = poSeeds.map(([id, poNumber, projectId, status, off]) => {
  const p = projects.find((x) => x.id === projectId)!
  return { id, poNumber, projectId, clientId: p.clientId, amount: total(p), currency: p.pricing?.currency ?? "INR", issueDate: off === null ? null : d(off), status, notes: "" }
})

/** Visits = the scheduled job dates of each project */
export const visits: Visit[] = projects.flatMap((p) =>
  (p.schedule?.dates ?? []).map<Visit>((date, i) => {
    const done = p.completion.jobDoneAt !== null
    return {
      id: `vis_${p.id.slice(4)}_${i + 1}`,
      projectId: p.id,
      inspectorId: p.assignedInspectorId!,
      type: "Inspection",
      date,
      status: done ? "Completed" : "Upcoming",
      unitsSpent: done ? 1 : null,
      expenses: done ? (p.pricing?.currency === "AED" ? 150 : 1500) : null,
      notes: done ? "Witnessed as per ITP; no major findings." : "",
      completedAt: done ? p.completion.jobDoneAt : null,
    }
  }),
)
