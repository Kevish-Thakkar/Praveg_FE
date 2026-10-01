import { useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Clock, Download, Mail, Paperclip, Reply, Zap } from "@/components/icons"
import { FileTypeIcon } from "@/components/common/FileTypeIcon"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatDate, formatDateTime } from "@/lib/dates"
import { EMAIL_KIND_CLS } from "@/lib/category-colors"
import { cn } from "@/lib/utils"
import { documentService, type EmailRow } from "@/services"
import type { EmailKind } from "@/types/domain"

/** Who the email goes to decides its colour: inspector, client, or payment. */
export const EMAIL_AUDIENCE: Record<EmailKind, { label: string; cls: string }> = {
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
export function useAttachmentDownload() {
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
          <FileTypeIcon name={a.name} className="size-3.5" />
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

/** Email log (inbox, sent) with attachment download. Opens the conversation on click. */
export function EmailList({ emails, empty, showProject = true, fill = false, dateHeader = "Sent" }: { emails: EmailRow[]; empty?: ReactNode; showProject?: boolean; fill?: boolean; dateHeader?: string }) {
  const navigate = useNavigate()
  const dl = useAttachmentDownload()

  const columns = useMemo<Column<EmailRow>[]>(() => [
    {
      id: "email", header: "Email", sortValue: (e) => e.subject,
      cell: (e) => {
        const a = EMAIL_AUDIENCE[e.kind]
        const scheduled = e.status === "Scheduled"
        const inbound = e.direction === "Inbound"
        return (
          <div className="flex min-w-0 max-w-[26rem] items-start gap-3">
            <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", scheduled ? "bg-violet-soft text-violet" : a.cls)}>
              {scheduled ? <Clock className="size-4" aria-hidden /> : inbound ? <Reply className="size-4" aria-hidden /> : e.automatic ? <Zap className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            </span>
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5">
                {e.unread && <span className="size-2 shrink-0 rounded-full bg-primary-strong" aria-label="Unread" />}
                <span className={cn("truncate text-foreground", e.unread ? "font-semibold" : "font-medium")}>{e.subject}</span>
                {e.threadCount > 1 && <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded bg-muted px-1.5 text-[11px] leading-none font-semibold text-muted-foreground tabular-nums" title={`${e.threadCount} messages in this conversation`}>{e.threadCount}</span>}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", a.cls)}>{a.label}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", EMAIL_KIND_CLS[e.kind])}>{e.kind}</span>
                {e.automatic && <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">Automatic</span>}
              </p>
              {inbound
                ? <p className="truncate pt-0.5 text-xs text-muted-foreground" title={e.fromAddress}>From {e.fromName}{e.fromName !== e.fromAddress ? ` <${e.fromAddress}>` : ""}</p>
                : <p className="truncate pt-0.5 text-xs text-muted-foreground" title={[...e.to, ...e.cc].join(", ")}>To {e.to.join(", ")}{e.cc.length ? ` · +${e.cc.length} CC` : ""}</p>}
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
      id: "sent", header: dateHeader, sortValue: (e) => e.sentAt,
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
  ], [showProject, dateHeader, dl.busy])

  if (!emails.length) return <>{empty ?? <EmptyState compact icon={Mail} title="No emails yet" description="Emails sent from the platform are saved here automatically." />}</>

  return (
    <>
      <DataTable
        fill={fill}
        rows={emails}
        columns={columns}
        getRowId={(e) => e.id}
        onRowClick={(e) => navigate(`/emails/${e.threadId}`)}
        initialSort={{ id: "sent", dir: "desc" }}
        caption="Emails"
        mobileCard={(e) => (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2"><p className={cn("min-w-0 truncate", e.unread ? "font-semibold" : "font-medium")}>{e.subject}</p><StatusBadge status={e.status} /></div>
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", EMAIL_KIND_CLS[e.kind])}>{e.kind}</span>
              <span>{e.direction === "Inbound" ? `From ${e.fromName} · ` : ""}{formatDate(e.sentAt, "dd MMM, HH:mm")}{e.projectCode ? ` · ${e.projectCode}` : ""}</span>
            </p>
            {e.attachments.length > 0 && <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Paperclip className="size-3" /> {e.attachments.length} attachment{e.attachments.length === 1 ? "" : "s"}</p>}
          </div>
        )}
      />
    </>
  )
}
