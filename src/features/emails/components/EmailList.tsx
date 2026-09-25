import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Clock, Download, FileText, Mail, Paperclip, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatDate, formatDateTime } from "@/lib/dates"
import { formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"
import { documentService, type EmailRow } from "@/services"
import type { EmailKind } from "@/types/domain"

/** Who the email goes to decides its colour: inspector, client, or payment. */
const AUDIENCE: Record<EmailKind, { label: string; cls: string }> = {
  "Availability Request": { label: "Inspector", cls: "bg-info-soft text-info" },
  Interview: { label: "Inspector", cls: "bg-info-soft text-info" },
  "Inspector Confirmation": { label: "Inspector", cls: "bg-info-soft text-info" },
  "Job Reminder": { label: "Inspector", cls: "bg-info-soft text-info" },
  "Report Request": { label: "Inspector", cls: "bg-info-soft text-info" },
  "CVs to Client": { label: "Client", cls: "bg-violet-soft text-violet" },
  Completion: { label: "Client", cls: "bg-violet-soft text-violet" },
  General: { label: "Client", cls: "bg-violet-soft text-violet" },
  "Payment Reminder": { label: "Payment", cls: "bg-warning-soft text-warning" },
  "Payment Follow-up": { label: "Payment", cls: "bg-warning-soft text-warning" },
}

/** Generates short-lived download links (mock) for one or many attachments; one toast for the batch. */
function useAttachmentDownload() {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, ids: string[]) => {
    if (!ids.length) return
    setBusy(key)
    const results = await Promise.allSettled(ids.map((id) => documentService.requestDownload(id)))
    setBusy(null)
    const ok = results.filter((r) => r.status === "fulfilled").length
    const failed = results.length - ok
    if (ok) toast.success(ok === 1 && results.length === 1 ? `Download ready: ${(results[0] as PromiseFulfilledResult<{ name: string }>).value.name}` : `${ok} attachment${ok === 1 ? "" : "s"} ready to download`, { description: "Secure links expire in 5 minutes (prototype — no file is downloaded)." })
    if (failed) toast.error(`${failed} attachment${failed === 1 ? "" : "s"} could not be downloaded`, { description: (results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined)?.reason?.message })
  }
  return { busy, run }
}

function Attachments({ e, dl, compact }: { e: EmailRow; dl: ReturnType<typeof useAttachmentDownload>; compact?: boolean }) {
  const files = e.attachments.filter((a) => a.available)
  if (!e.attachments.length) return <span className="text-xs text-muted-foreground">No attachments</span>
  const shown = compact ? e.attachments.slice(0, 2) : e.attachments
  return (
    <div className="flex min-w-0 flex-col gap-1" onClick={(ev) => ev.stopPropagation()}>
      {shown.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={!a.available || !!dl.busy}
          onClick={() => void dl.run(a.id, [a.id])}
          className="group flex max-w-60 items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-left text-xs transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:opacity-50"
          title={a.available ? `Download ${a.name}` : "File removed"}
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{a.name}</span>
          {dl.busy === a.id ? <Spinner /> : <Download className="size-3.5 shrink-0 text-primary-text opacity-70 group-hover:opacity-100" aria-hidden />}
        </button>
      ))}
      {files.length > 1 && (
        <button type="button" disabled={!!dl.busy} onClick={() => void dl.run(`all_${e.id}`, files.map((f) => f.id))} className="inline-flex w-fit items-center gap-1 text-[11px] font-medium text-primary-text hover:underline disabled:opacity-50">
          {dl.busy === `all_${e.id}` ? <Spinner /> : <Download className="size-3" aria-hidden />}
          Download all ({files.length}){compact && e.attachments.length > 2 ? ` · +${e.attachments.length - 2} more` : ""}
        </button>
      )}
    </div>
  )
}

/** Sent / scheduled email log with attachment download. Opens a reader on click. */
export function EmailList({ emails, empty, showProject = true }: { emails: EmailRow[]; empty?: ReactNode; showProject?: boolean }) {
  const [open, setOpen] = useState<EmailRow | null>(null)
  const dl = useAttachmentDownload()

  const columns = useMemo<Column<EmailRow>[]>(() => [
    {
      id: "email", header: "Email", sortValue: (e) => e.subject,
      cell: (e) => {
        const a = AUDIENCE[e.kind]
        const scheduled = e.status === "Scheduled"
        return (
          <div className="flex min-w-0 max-w-[26rem] items-start gap-3">
            <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", scheduled ? "bg-violet-soft text-violet" : a.cls)}>
              {scheduled ? <Clock className="size-4" aria-hidden /> : e.automatic ? <Zap className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{e.subject}</p>
              <p className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", a.cls)}>{a.label}</span>
                <span className="text-[11px] text-muted-foreground">{e.kind}</span>
                {e.automatic && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Automatic</span>}
              </p>
              <p className="truncate pt-0.5 text-xs text-muted-foreground" title={[...e.to, ...e.cc].join(", ")}>To {e.to.join(", ")}{e.cc.length ? ` · +${e.cc.length} CC` : ""}</p>
            </div>
          </div>
        )
      },
    },
    ...(showProject ? [{
      id: "project", header: "Project", hideBelow: "lg" as const, sortValue: (e: EmailRow) => e.projectCode ?? "~",
      cell: (e: EmailRow) => e.projectId ? (
        <div className="min-w-0 max-w-[14rem]" onClick={(ev) => ev.stopPropagation()}>
          <Link to={`/projects/${e.projectId}`} className="text-sm font-medium text-primary-text hover:underline">{e.projectCode}</Link>
          <p className="truncate text-xs text-muted-foreground">{e.projectTitle}</p>
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span>,
    }] : []),
    {
      id: "sent", header: "Sent", sortValue: (e) => e.sentAt,
      cell: (e) => (
        <div className="space-y-0.5">
          <StatusBadge status={e.status} />
          <p className="text-xs whitespace-nowrap text-foreground">{e.status === "Scheduled" ? "Goes out " : ""}{formatDateTime(e.sentAt)}</p>
          <p className="text-[11px] text-muted-foreground">{e.sentByName}</p>
        </div>
      ),
    },
    { id: "files", header: "Attachments", hideBelow: "md", cell: (e) => <Attachments e={e} dl={dl} compact /> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [showProject, dl.busy])

  if (!emails.length) return <>{empty ?? <EmptyState compact icon={Mail} title="No emails yet" description="Emails sent from the platform are saved here automatically." />}</>

  return (
    <>
      <DataTable
        rows={emails}
        columns={columns}
        getRowId={(e) => e.id}
        onRowClick={setOpen}
        initialSort={{ id: "sent", dir: "desc" }}
        caption="Emails"
        mobileCard={(e) => (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2"><p className="min-w-0 truncate font-medium">{e.subject}</p><StatusBadge status={e.status} /></div>
            <p className="text-xs text-muted-foreground">{e.kind} · {formatDate(e.sentAt, "dd MMM, HH:mm")}{e.projectCode ? ` · ${e.projectCode}` : ""}</p>
            {e.attachments.length > 0 && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="size-3" /> {e.attachments.length} attachment{e.attachments.length === 1 ? "" : "s"}</p>}
          </div>
        )}
      />
      <DetailDrawer open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={open?.subject} description={open ? `${open.kind} · ${open.status === "Scheduled" ? "goes out" : "sent"} ${formatDateTime(open.sentAt)} · ${open.sentByName}` : undefined} size="lg">
        {open && (
          <div className="space-y-5">
            <dl className="divide-y rounded-lg border text-sm">
              {([["To", open.to.join(", ")], ["CC", open.cc.join(", ") || "—"], ["BCC", open.bcc.join(", ") || "—"], ["Project", open.projectCode ? `${open.projectCode} · ${open.projectTitle}` : "—"]] as const).map(([k, v]) => (
                <div key={k} className="grid grid-cols-[4.5rem_1fr] gap-3 px-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap">{open.body}</div>
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Paperclip className="size-4" /> Attachments ({open.attachments.length})</h3>
                {open.attachments.filter((a) => a.available).length > 1 && (
                  <Button size="sm" variant="outline" disabled={!!dl.busy} onClick={() => void dl.run(`all_${open.id}`, open.attachments.filter((a) => a.available).map((a) => a.id))}>
                    {dl.busy === `all_${open.id}` ? <Spinner /> : <Download />} Download all
                  </Button>
                )}
              </div>
              {open.attachments.length === 0 ? <p className="text-sm text-muted-foreground">No attachments</p> : (
                <ul className="divide-y rounded-lg border">
                  {open.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm">{a.name}</span><span className="text-xs text-muted-foreground">{a.available ? `${a.category} · ${formatFileSize(a.sizeKb)}` : "File removed"}</span></span>
                      <Button size="sm" variant="ghost" disabled={!a.available || !!dl.busy} onClick={() => void dl.run(a.id, [a.id])} aria-label={`Download ${a.name}`}>
                        {dl.busy === a.id ? <Spinner /> : <Download />} Download
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DetailDrawer>
    </>
  )
}
