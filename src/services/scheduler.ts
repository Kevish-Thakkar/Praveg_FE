import { db, newId } from "@/mock/db"

/**
 * Simulated email scheduler. Automatic emails (job reminder 1 day before, report request the day after
 * the job) are stored as "Scheduled"; each API call flips any whose time has passed to "Sent".
 * Simulated inbound replies are queued the same way and become "Received" when their time comes.
 * Production: a backend job queue / cron does this, and an IMAP poller / inbound webhook receives mail.
 */
export function processScheduledEmails(): void {
  const now = new Date().toISOString()
  for (const e of db.emails) {
    if (e.status !== "Scheduled" || e.sentAt > now) continue
    const p = db.projects.find((x) => x.id === e.projectId)
    if (e.direction === "Inbound") {
      e.status = "Received"
      db.notifications.unshift({
        id: newId("ntf"), kind: "Email", title: `New reply — ${e.subject.slice(0, 60)}`, body: `From ${e.from ?? "unknown sender"}`,
        link: `/emails/${e.threadId ?? e.id}`, read: false, roles: ["Coordinator", "Super Admin", "Accountant"], createdAt: now,
      })
      continue
    }
    e.status = "Sent"
    db.notifications.unshift({
      id: newId("ntf"), kind: "Email", title: `Automatic email sent — ${e.kind}`, body: `${e.subject} → ${e.to.join(", ")}`,
      link: p ? `/projects/${p.id}?tab=emails` : null, read: false, roles: ["Coordinator", "Super Admin"], createdAt: now,
    })
  }
}

export function scheduleAt(date: string, hour = 9): string {
  const d = new Date(`${date}T00:00:00`)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}
