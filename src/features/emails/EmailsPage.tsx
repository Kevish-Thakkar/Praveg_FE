import { useMemo } from "react"
import { Mail } from "lucide-react"
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

const KINDS: EmailKind[] = ["Availability Request", "CVs to Client", "Interview", "Inspector Confirmation", "Job Reminder", "Report Request", "Completion", "Payment Reminder", "Payment Follow-up", "General"]
const AUDIENCE: Record<EmailKind, "Inspector" | "Client" | "Payment"> = {
  "Availability Request": "Inspector", Interview: "Inspector", "Inspector Confirmation": "Inspector", "Job Reminder": "Inspector", "Report Request": "Inspector",
  "CVs to Client": "Client", Completion: "Client", General: "Client", "Payment Reminder": "Payment", "Payment Follow-up": "Payment",
}
const KEYS = ["kind", "audience", "status", "project"] as const

/** Every email sent from the platform plus automatic emails scheduled to go out. Emails are composed from the project. */
export function EmailsPage() {
  const role = useRole()
  const q = useEmails()
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const v = f.values
  const all = useMemo(() => q.data ?? [], [q.data])
  const kinds = role === "Coordinator" ? KINDS.filter((k) => !k.startsWith("Payment")) : KINDS

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    const has = (list: string[], x: string) => !list.length || list.includes(x)
    return all.filter((e) =>
      has(v.kind, e.kind) && has(v.audience, AUDIENCE[e.kind]) && has(v.status, e.status) && has(v.project, e.projectId ?? "none") &&
      (!s || `${e.subject} ${e.to.join(" ")} ${e.cc.join(" ")} ${e.projectCode ?? ""} ${e.projectTitle ?? ""} ${e.sentByName}`.toLowerCase().includes(s)))
  }, [all, v, search])

  const count = (pred: (e: (typeof all)[number]) => boolean) => all.filter(pred).length
  const projects = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of all) m.set(e.projectId ?? "none", e.projectCode ? `${e.projectCode} · ${e.projectTitle ?? ""}` : "No project")
    return [...m.entries()].map(([value, label]) => ({ value, label, count: all.filter((e) => (e.projectId ?? "none") === value).length })).sort((a, b) => a.label.localeCompare(b.label))
  }, [all])
  const filters: FilterDef[] = [
    { id: "status", label: "Status", options: ["Sent", "Scheduled", "Failed"].map((s) => ({ value: s, label: s, count: count((e) => e.status === s) })), value: v.status, onChange: (x) => f.set("status", x) },
    { id: "audience", label: "Sent to", options: (role === "Coordinator" ? ["Inspector", "Client"] : ["Inspector", "Client", "Payment"]).map((a) => ({ value: a, label: a === "Payment" ? "Client (payment)" : a, count: count((e) => AUDIENCE[e.kind] === a) })), value: v.audience, onChange: (x) => f.set("audience", x) },
    { id: "kind", label: "Email type", options: kinds.map((k) => ({ value: k, label: k, count: count((e) => e.kind === k) })), value: v.kind, onChange: (x) => f.set("kind", x) },
    { id: "project", label: "Project", options: projects, value: v.project, onChange: (x) => f.set("project", x) },
  ]

  return (
    <PageContainer>
      <PageHeader title="Emails" description="Every email sent from the platform, plus automatic emails scheduled to go out (job reminders, report requests). New emails are sent from the project." />
      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Search subject, recipient, project or sender" }} filters={filters} onClearFilters={f.clear} />
        {q.isPending ? <TableSkeleton rows={6} columns={3} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <EmailList fill emails={rows} empty={<EmptyState icon={Mail} title={search || f.activeCount ? "No emails match" : "No emails yet"} description={search || f.activeCount ? "Try another filter or clear the search." : "Sent emails are saved here automatically."} />} />
        )}
      </Card>
    </PageContainer>
  )
}
