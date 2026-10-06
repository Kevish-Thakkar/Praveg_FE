import type { PORow, ProjectRow } from "@/services"

/** Draft PO for a project that has no PO record yet (id "" = not saved). Amount and currency come from the client price. */
export function newPoFor(p: ProjectRow): PORow {
  return {
    id: "", poNumber: "", projectId: p.id, clientId: p.clientId, amount: p.priceTotal, currency: p.pricing?.currency ?? (p.site.country === "India" ? "INR" : "AED"),
    issueDate: null, status: "Received", notes: "", projectCode: p.code, projectTitle: p.title, clientName: p.clientName,
  }
}
