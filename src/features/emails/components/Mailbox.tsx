import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { EmailRow } from "@/services"

export type MailboxId = "inbox" | "sent"
const BOXES: { id: MailboxId; label: string }[] = [
  { id: "inbox", label: "Inbox" },
  { id: "sent", label: "Sent" },
]

export const inMailbox = (e: EmailRow, box: MailboxId) =>
  box === "inbox" ? e.direction === "Inbound" : e.direction === "Outbound" && e.status !== "Scheduled"

/** Column header for the date column in each mailbox. */
export const MAILBOX_DATE_HEADER: Record<MailboxId, string> = { inbox: "Received", sent: "Sent" }

/** Active mailbox kept in the URL (?box=) so it survives back/forward from a conversation. */
export function useMailbox(): [MailboxId, (b: MailboxId) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get("box")
  const box = BOXES.some((b) => b.id === raw) ? (raw as MailboxId) : "inbox"
  const set = useCallback((b: MailboxId) => setParams((p) => { const n = new URLSearchParams(p); n.set("box", b); return n }, { replace: true }), [setParams])
  return [box, set]
}

/** Inbox / Sent switch. Inbox shows the unread count; the others show totals. */
export function MailboxTabs({ value, onChange, emails }: { value: MailboxId; onChange: (b: MailboxId) => void; emails: EmailRow[] }) {
  const count = (b: MailboxId) => (b === "inbox" ? emails.filter((e) => inMailbox(e, b) && e.unread).length : emails.filter((e) => inMailbox(e, b)).length)
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MailboxId)}>
      <div className="border-b px-4 sm:px-5">
        <TabsList variant="line" className="h-11 gap-6 p-0" aria-label="Mailbox">
          {BOXES.map((b) => {
            const n = count(b.id)
            return (
              <TabsTrigger key={b.id} value={b.id} className="group h-11 flex-none gap-2 px-0.5 text-sm after:!bottom-0">
                {b.label}
                {n > 0 && (
                  <span
                    aria-label={b.id === "inbox" ? `${n} unread` : `${n} emails`}
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] leading-none font-semibold tabular-nums transition-colors",
                      b.id === "inbox"
                        ? "bg-primary-strong text-white"
                        : "bg-muted text-muted-foreground group-data-[state=active]:bg-primary-light group-data-[state=active]:text-primary-dark",
                    )}
                  >
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
      </div>
    </Tabs>
  )
}
