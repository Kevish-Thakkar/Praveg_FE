/** Status → tone mapping. One place so every badge in the app reads the same. */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "violet"

export const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-neutral-soft text-neutral",
  violet: "bg-violet-soft text-violet",
}

const MAP: Record<string, Tone> = {
  // project stage (v2)
  Inquiry: "neutral",
  "Inspector Assigned": "info",
  "CVs Sent": "violet",
  "Inspector Confirmed": "warning",
  "Job Scheduled": "info",
  Completed: "success",
  Cancelled: "danger",
  // availability
  "Not Available": "neutral",
  // billing
  "Invoice Pending": "warning",
  "Awaiting Payment": "info",
  "Not Billable": "neutral",
  Scheduled: "violet",
  Passed: "success",
  Pending: "warning",
  "Due soon": "warning",
  "Due today": "warning",
  "Not due": "neutral",
  // availability request
  Requested: "warning",
  Received: "info",
  Sent: "violet",
  Selected: "success",
  "Not Selected": "neutral",
  // PO
  "Awaiting PO": "danger",
  Invoiced: "violet",
  Closed: "neutral",
  // visit
  Upcoming: "info",
  // reminder
  Open: "warning",
  Done: "success",
  Overdue: "danger",
  // users / inspectors
  Active: "success",
  Invited: "warning",
  Disabled: "neutral",
  Inactive: "neutral",
  Available: "success",
  "On Assignment": "info",
  // finance
  Paid: "success",
  Submitted: "warning",
  Approved: "success",
  Rejected: "danger",
  // integrations
  "Not Connected": "neutral",
  Connecting: "info",
  "Connection Failed": "danger",
  Connected: "success",
  // documents
  Restricted: "warning",
  Internal: "neutral",
  Failed: "danger",
}

export function toneFor(status: string): Tone {
  return MAP[status] ?? "neutral"
}
