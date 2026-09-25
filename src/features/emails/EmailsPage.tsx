import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { Mail } from "lucide-react"
import { useEmails } from "./hooks"
import { useRole } from "@/store/session.store"
import { EmailList } from "./components/EmailList"

/** §6.6 — records of every email sent from the platform */
const KINDS = ["Availability Request", "CVs to Client", "Interview", "Inspector Confirmation", "Job Reminder", "Report Request", "Completion", "Payment Reminder", "Payment Follow-up", "General"]

export function EmailsPage() {
  const role = useRole()
  const q = useEmails()
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState(ALL)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? []).filter((e) => (kind === ALL || e.kind === kind) && (!s || `${e.subject} ${e.to.join(" ")} ${e.projectCode ?? ""}`.toLowerCase().includes(s)))
  }, [q.data, search, kind])
  return (
    <PageContainer>
      <PageHeader title="Emails" description="Every email sent from the platform, plus automatic emails scheduled to go out (job reminders, report requests). Emails are composed from the project." />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={!!search || kind !== ALL} onReset={() => { setSearch(""); setKind(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Subject, recipient, project" />
            <FilterSelect label="Type" value={kind} onChange={setKind} options={role === "Coordinator" ? KINDS.filter((k) => !k.startsWith("Payment")) : KINDS} allLabel="All email types" className="sm:w-52" />
          </FilterBar>
        </div>
        {q.isPending ? <TableSkeleton rows={5} columns={2} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <EmailList emails={rows} empty={<EmptyState icon={Mail} title="No emails found" description="Sent emails are saved here automatically." />} />
        )}
      </Card>
    </PageContainer>
  )
}
