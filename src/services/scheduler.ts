import { db, newId } from "@/mock/db"

/**
 * Simulated email scheduler. Automatic emails (job reminder 1 day before, report request the day after
 * the job) are stored as "Scheduled"; each API call flips any whose time has passed to "Sent".
 * Production: a backend job queue / cron does this.
 */
export function processScheduledEmails(): void {
  const now = new Date().toISOString()
  for (const e of db.emails) {
    if (e.status !== "Scheduled" || e.sentAt > now) continue
    e.status = "Sent"
    const p = db.projects.find((x) => x.id === e.projectId)
    db.notifications.unshift({
      id: newId("ntf"), kind: "Email", title: `Automatic email sent — ${e.kind}`, body: `${e.subject} → ${e.to.join(", ")}`,
      link: p ? `/projects/${p.id}` : "/emails", read: false, roles: ["Coordinator", "Super Admin"], createdAt: now,
    })
  }
}

export function scheduleAt(date: string, hour = 9): string {
  const d = new Date(`${date}T00:00:00`)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
