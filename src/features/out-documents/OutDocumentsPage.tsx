import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { CalendarCheck2, FileCheck2, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { TextLink } from "@/components/common/TextLink"
import { usePermission } from "@/components/common/Can"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { useFillHeight } from "@/hooks/use-fill-height"
import { DocumentsPanel } from "@/features/documents/components/DocumentsPanel"
import { useEmails, useSendEmail } from "@/features/emails/hooks"
import { PresetComposer } from "@/features/emails/components/PresetComposer"
import { EmailList } from "@/features/emails/components/EmailList"
import { useProjects, useSendCompletion } from "@/features/projects/hooks"
import type { ProjectRow } from "@/services"

/** Out documents: reports and documents going to the client for jobs that have been carried out. */
export function OutDocumentsPage() {
  const q = useProjects()
  const isMobile = useIsMobile()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const selectedId = params.get("project")
  const [fillRef, fillHeight] = useFillHeight<HTMLDivElement>()
  const jobs = useMemo(() => (q.data ?? []).filter((p) => p.completion.jobDoneAt).sort((a, b) => (b.completion.jobDoneAt ?? "").localeCompare(a.completion.jobDoneAt ?? "")), [q.data])
  const list = useMemo(() => {
    const s = search.trim().toLowerCase()
    return jobs.filter((p) => !s || `${p.code} ${p.title} ${p.clientName}`.toLowerCase().includes(s))
  }, [jobs, search])
  const selected = jobs.find((p) => p.id === selectedId) ?? (isMobile ? undefined : list[0])
  const select = (id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set("project", id); else n.delete("project"); return n }, { replace: true })

  return (
    <PageContainer>
      <PageHeader title="Out documents" description="Reports and documents going out to clients for jobs that have been carried out. Upload files, send them by email and keep a record." />
      {q.isPending ? <Card><TableSkeleton rows={6} columns={3} /></Card> : q.isError ? <Card><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></Card> : !jobs.length ? (
        <Card><EmptyState icon={FileCheck2} title="No completed jobs yet" description="Jobs appear here once they are marked done." /></Card>
      ) : (
        <div ref={fillRef} style={{ height: fillHeight }} className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
            <div className="border-b p-3"><SearchInput value={search} onChange={setSearch} placeholder="Search jobs" className="sm:w-full" /></div>
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto" aria-label="Jobs">
              {list.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => select(p.id)} aria-current={selected?.id === p.id} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none", selected?.id === p.id && "bg-primary-soft/60 shadow-[inset_3px_0_0_var(--primary)]")}>
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-md border bg-card py-1 leading-tight">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase">{formatDate(p.completion.jobDoneAt, "MMM")}</span>
                      <span className="text-base font-semibold tabular-nums">{formatDate(p.completion.jobDoneAt, "dd")}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{p.code} · {p.clientName}</span>
                      <span className="mt-1 block"><StatusBadge status={p.stage === "Completed" ? "Sent to client" : p.completion.reportUploadedAt ? "Report received" : "Report awaited"} tone={p.stage === "Completed" ? "success" : p.completion.reportUploadedAt ? "info" : "warning"} /></span>
                    </span>
                  </button>
                </li>
              ))}
              {!list.length && <li><EmptyState compact title="No matches" /></li>}
            </ul>
          </Card>
          {isMobile ? (
            <DetailDrawer open={!!selected} onOpenChange={(o) => !o && select(null)} title={selected ? `${selected.code} · ${selected.title}` : ""} size="xl">
              {selected && <OutDocumentDetail p={selected} />}
            </DetailDrawer>
          ) : (
            selected && <div className="min-h-0 overflow-y-auto pr-1"><OutDocumentDetail key={selected.id} p={selected} /></div>
          )}
        </div>
      )}
    </PageContainer>
  )
}

function OutDocumentDetail({ p }: { p: ProjectRow }) {
  const [composer, setComposer] = useState<"completion" | "general" | null>(null)
  const canEmail = usePermission("outDocuments", "create")
  const emails = useEmails({ projectId: p.id })
  const send = useSendEmail()
  const complete = useSendCompletion()
  const outEmails = (emails.data ?? []).filter((e) => e.kind === "Completion" || e.kind === "General" || e.kind === "Report Request")
  const canComplete = !!p.completion.reportUploadedAt && p.stage !== "Completed"

  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={p.stage} /><span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><CalendarCheck2 className="size-4" /> Job done {formatDate(p.completion.jobDoneAt)}</span></div>
            <p className="font-semibold">{p.title}</p>
            <p className="text-sm text-muted-foreground"><TextLink to={`/projects/${p.id}`}>{p.code}</TextLink> · {p.clientName} · {p.site.city} · {p.assignedInspectorName}</p>
          </div>
          {canEmail && (canComplete
            ? <Button onClick={() => setComposer("completion")} className="shrink-0"><Send /> Send completion email</Button>
            : <Button variant="outline" onClick={() => setComposer("general")} className="shrink-0"><Mail /> Send documents</Button>)}
        </CardContent>
      </Card>
      <Tabs defaultValue="docs">
        <TabsList className="bg-card">
          <TabsTrigger value="docs">Report & documents</TabsTrigger>
          <TabsTrigger value="emails">Emails <span className="text-muted-foreground tabular-nums">{outEmails.length}</span></TabsTrigger>
        </TabsList>
        <TabsContent value="docs" className="mt-4">
          <DocumentsPanel readOnly={p.locked} entityType="Project" entityId={p.id} categories={["Report", "Out Document"]} title="Report & documents" description="Upload several files at once. They can be attached to the email to the client." />
        </TabsContent>
        <TabsContent value="emails" className="mt-4">
          <Card className="gap-0 overflow-hidden py-0">
            {emails.isPending ? <TableSkeleton rows={3} columns={2} /> : emails.isError ? <ErrorState message={emails.error.message} onRetry={() => void emails.refetch()} /> : (
              <EmailList showProject={false} emails={outEmails} empty={<EmptyState compact title="No emails yet" description="Send the report to the client from here." />} />
            )}
          </Card>
        </TabsContent>
      </Tabs>
      <PresetComposer
        open={composer === "completion"} onOpenChange={(o) => !o && setComposer(null)} projectId={p.id} kind="Completion"
        title="Send completion email" description="Sending marks the project Completed and notifies Accounts." sendLabel="Send & complete"
        sending={complete.isPending} onSend={(email) => complete.mutate({ projectId: p.id, email }, { onSuccess: () => setComposer(null) })}
      />
      <PresetComposer
        open={composer === "general"} onOpenChange={(o) => !o && setComposer(null)} projectId={p.id} kind="General"
        title="Send documents to client" description={`${p.code} · ${p.clientName}`}
        sending={send.isPending} onSend={(email) => send.mutate(email, { onSuccess: () => setComposer(null) })}
      />
    </div>
  )
}
