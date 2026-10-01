import { useMemo } from "react"
import { Mail } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar, type FilterDef } from "@/components/tables/ListToolbar"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { useRole } from "@/store/session.store"
import type { EmailKind } from "@/types/domain"
import { useEmails } from "./hooks"
import { EmailList } from "./components/EmailList"
import { MAILBOX_DATE_HEADER, MailboxTabs, inMailbox, useMailbox } from "./components/Mailbox"

const KINDS: EmailKind[] = ["Availability Request", "CVs to Client", "Interview", "Inspector Confirmation", "Job Reminder", "Report Request", "Completion", "Payment Reminder", "Payment Follow-up", "General"]
const AUDIENCE: Record<EmailKind, "Inspector" | "Client" | "Payment"> = {
  "Availability Request": "Inspector", Interview: "Inspector", "Inspector Confirmation": "Inspector", "Job Reminder": "Inspector", "Report Request": "Inspector",
  "CVs to Client": "Client", Completion: "Client", General: "Client", "Payment Reminder": "Payment", "Payment Follow-up": "Payment",
}
const KEYS = ["kind", "audience", "status", "project"] as const
const EMPTY: Record<string, { title: string; description: string }> = {
  inbox: { title: "No replies yet", description: "Replies from inspectors and clients arrive here." },
  sent: { title: "No emails yet", description: "Sent emails are saved here automatically." },
}

/** Mailbox: replies received and every email sent from the platform. */
export function EmailsPage() {
  const role = useRole()
  const q = useEmails()
  const [box, setBox] = useMailbox()
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const v = f.values
  const all = useMemo(() => q.data ?? [], [q.data])
  const inBox = useMemo(() => all.filter((e) => inMailbox(e, box)), [all, box])
  const kinds = role === "Coordinator" ? KINDS.filter((k) => !k.startsWith("Payment")) : KINDS

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    const has = (list: string[], x: string) => !list.length || list.includes(x)
    return inBox.filter((e) =>
      has(v.kind, e.kind) && has(v.audience, AUDIENCE[e.kind]) && (box !== "sent" || has(v.status, e.status)) && has(v.project, e.projectId ?? "none") &&
      (!s || `${e.subject} ${e.fromAddress} ${e.fromName} ${e.to.join(" ")} ${e.cc.join(" ")} ${e.projectCode ?? ""} ${e.projectTitle ?? ""} ${e.sentByName}`.toLowerCase().includes(s)))
  }, [inBox, v, search, box])

  const count = (pred: (e: (typeof all)[number]) => boolean) => inBox.filter(pred).length
  const projects = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of inBox) m.set(e.projectId ?? "none", e.projectCode ? `${e.projectCode} · ${e.projectTitle ?? ""}` : "No project")
    return [...m.entries()].map(([value, label]) => ({ value, label, count: inBox.filter((e) => (e.projectId ?? "none") === value).length })).sort((a, b) => a.label.localeCompare(b.label))
  }, [inBox])
  const filters: FilterDef[] = [
    ...(box === "sent" ? [{ id: "status", label: "Status", options: ["Sent", "Failed"].map((s) => ({ value: s, label: s, count: count((e) => e.status === s) })), value: v.status, onChange: (x: string[]) => f.set("status", x) }] : []),
    { id: "audience", label: box === "inbox" ? "From" : "Sent to", options: (role === "Coordinator" ? ["Inspector", "Client"] : ["Inspector", "Client", "Payment"]).map((a) => ({ value: a, label: a === "Payment" ? "Client (payment)" : a, count: count((e) => AUDIENCE[e.kind] === a) })), value: v.audience, onChange: (x) => f.set("audience", x) },
    { id: "kind", label: "Email type", options: kinds.map((k) => ({ value: k, label: k, count: count((e) => e.kind === k) })), value: v.kind, onChange: (x) => f.set("kind", x) },
    { id: "project", label: "Project", searchable: true, inline: true, options: projects, value: v.project, onChange: (x) => f.set("project", x) },
  ]
  const filtered = !!search || f.activeCount > 0

  return (
    <PageContainer>
      <PageHeader title="Emails" description="Replies from inspectors and clients, and every email sent from the platform. Open an email to see the whole conversation and reply. New emails are sent from the project." />
      <Card className="gap-0 overflow-hidden py-0">
        <MailboxTabs value={box} onChange={setBox} emails={all} />
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Search subject, sender, recipient or project" }} filters={filters} onClearFilters={f.clear} />
        {q.isPending ? <TableSkeleton rows={6} columns={3} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <EmailList fill emails={rows} dateHeader={MAILBOX_DATE_HEADER[box]} empty={<EmptyState icon={Mail} title={filtered ? "No emails match" : EMPTY[box]!.title} description={filtered ? "Try another filter or clear the search." : EMPTY[box]!.description} />} />
        )}
      </Card>
    </PageContainer>
  )
}
