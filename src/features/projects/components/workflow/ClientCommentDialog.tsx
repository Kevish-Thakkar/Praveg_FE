import { useMemo, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ExternalLink, Mail, Pencil } from "@/components/icons"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/feedback/LoadingState"
import { useEmails } from "@/features/emails/hooks"
import { formatDateTime, todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { EmailRow, ProjectRow } from "@/services"
import { useCompleteJob, useRequestReportChanges } from "../../hooks"

export type ClientCommentMode = "complete" | "changes"

/** Reply body without the greeting and sign-off, as the starting point for the saved comment. */
function commentFrom(body: string) {
  const parts = body.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)
  if (parts.length > 1 && /^(dear|hi|hello)\b/i.test(parts[0]!)) parts.shift()
  if (parts.length > 1 && /^(regards|best|thanks|thank you|kind regards|sincerely)\b/i.test(parts[parts.length - 1]!)) parts.pop()
  return parts.join("\n\n")
}

/**
 * Records the client's comment on the report. "complete" closes the job (Accounts can invoice);
 * "changes" asks for a revised report. Uses the client's reply in the completion thread when there
 * is one, or a comment typed in by the coordinator (phone, WhatsApp, another mailbox).
 */
export function ClientCommentDialog({ p, mode, onClose }: { p: ProjectRow; mode: ClientCommentMode; onClose: () => void }) {
  const emails = useEmails({ projectId: p.id })
  const complete = useCompleteJob()
  const changes = useRequestReportChanges()
  const mutation = mode === "complete" ? complete : changes
  const sent = p.completion.completionEmailSentAt ?? ""
  const replies = useMemo(
    () => (emails.data ?? []).filter((e) => e.kind === "Completion" && e.direction === "Inbound" && e.sentAt > sent).sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [emails.data, sent],
  )
  // undefined = not chosen yet → latest reply if any; null = typed manually
  const [picked, setPicked] = useState<string | null | undefined>(undefined)
  const selected: EmailRow | null = picked === null ? null : replies.find((r) => r.id === picked) ?? replies[0] ?? null
  const [text, setText] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())
  const value = text ?? (selected ? commentFrom(selected.body) : "")

  const choose = (id: string | null) => { setPicked(id); setText(null) }
  const submit = () => mutation.mutate(
    { projectId: p.id, comment: { text: value, emailId: selected?.id ?? null, at: selected ? selected.sentAt : new Date(`${date}T12:00:00`).toISOString() } },
    { onSuccess: onClose },
  )

  return (
    <FormDialog
      open onOpenChange={(o) => !o && onClose()} size="lg" formId="client-comment-form"
      title={mode === "complete" ? "Complete job" : "Client asked for changes"}
      description={mode === "complete"
        ? "Save the client's comment on the report. The job is marked Completed and Accounts can invoice."
        : "Save the client's comment. Then upload the revised report and send it to the client again."}
      submitLabel={mode === "complete" ? "Save comment & complete job" : "Save — changes requested"}
      loading={mutation.isPending} submitDisabled={!value.trim() || emails.isPending}
    >
      <form id="client-comment-form" className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit() }}>
        {emails.isPending ? <div className="flex justify-center py-6"><Spinner /></div> : (
          <>
            <fieldset className="min-w-0 space-y-2">
              <legend className="mb-2 text-sm font-medium">Client's comment from</legend>
              {replies.map((r) => (
                <SourceOption key={r.id} active={selected?.id === r.id} onSelect={() => choose(r.id)} icon={<Mail className="size-4" />}>
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium">Reply from {r.fromName}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(r.sentAt)}</span>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{commentFrom(r.body)}</span>
                </SourceOption>
              ))}
              <SourceOption active={!selected} onSelect={() => choose(null)} icon={<Pencil className="size-4" />}>
                <span className="font-medium">Type the comment</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{replies.length ? "The client commented another way (phone, WhatsApp, another email)" : "No reply from the client has arrived in the system yet. If the client commented by phone, WhatsApp or another email, enter it here."}</span>
              </SourceOption>
            </fieldset>

            {!selected && (
              <div className="space-y-1.5">
                <Label htmlFor="comment-date">Date of the comment</Label>
                <Input id="comment-date" type="date" value={date} max={todayISO()} min={sent.slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="w-44" required />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="comment-text">Comment</Label>
                {selected && <Link to={`/emails/${selected.threadId}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-medium text-primary-text hover:underline">Open conversation <ExternalLink className="size-3" /></Link>}
              </div>
              <Textarea id="comment-text" rows={5} value={value} onChange={(e) => setText(e.target.value)} placeholder={mode === "complete" ? "e.g. Report reviewed, no further comments." : "e.g. Please add the hydrotest chart to section 4."} required />
              {selected && <p className="text-xs text-muted-foreground">Taken from the reply — you can shorten or edit it before saving.</p>}
            </div>
          </>
        )}
      </form>
    </FormDialog>
  )
}

function SourceOption({ active, onSelect, icon, children }: { active: boolean; onSelect: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button" role="radio" aria-checked={active} onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        active ? "border-primary-strong bg-primary-soft/50" : "hover:border-primary/50 hover:bg-muted/50",
      )}
    >
      <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2", active ? "border-primary-strong" : "border-input")} aria-hidden>
        {active && <span className="size-2 rounded-full bg-primary-strong" />}
      </span>
      <span className={cn("mt-px shrink-0", active ? "text-primary-strong" : "text-muted-foreground")}>{icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}
