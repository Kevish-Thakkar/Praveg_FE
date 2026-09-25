/** Resolves {{placeholders}} in client-provided email templates (§6.6). Unknown keys are left visible. */
export type MergeContext = Record<string, string>

export function renderTemplate(text: string, ctx: MergeContext): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key: string) => ctx[key] ?? m)
}

export const MERGE_FIELDS: { key: string; label: string }[] = [
  { key: "client.name", label: "Client name" },
  { key: "client.contactName", label: "Client contact name" },
  { key: "project.title", label: "Project title" },
  { key: "project.code", label: "Project code" },
  { key: "project.requiredBy", label: "Required by" },
  { key: "project.skills", label: "Required skills" },
  { key: "project.price", label: "Client price" },
  { key: "service.name", label: "Service" },
  { key: "site.location", label: "Site location" },
  { key: "vendor.name", label: "Vendor name" },
  { key: "inspector.name", label: "Inspector name" },
  { key: "inspector.list", label: "Inspector list (CVs)" },
  { key: "interview.at", label: "Interview date/time" },
  { key: "job.dates", label: "Job dates" },
  { key: "invoice.number", label: "Invoice number" },
  { key: "invoice.total", label: "Invoice total" },
  { key: "invoice.dueDate", label: "Payment due date" },
  { key: "sender.name", label: "Sender name" },
]
