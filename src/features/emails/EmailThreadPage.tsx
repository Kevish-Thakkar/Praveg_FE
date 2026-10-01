import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { isToday, isThisYear } from "date-fns"
import { FileTypeIcon } from "@/components/common/FileTypeIcon"
import { AlertTriangle, ArrowLeft, ChevronDown, Download, Forward, Paperclip, Reply, ReplyAll, Send, Trash2, X } from "@/components/icons"
import type { AppIcon } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PageContainer } from "@/components/layout/PageContainer"
import { StatusBadge } from "@/components/common/StatusBadge"
import { EmptyState } from "@/components/common/EmptyState"
import { ActionMenu } from "@/components/common/ActionMenu"
import { usePermission } from "@/components/common/Can"
import { DetailSkeleton, Spinner } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useDocuments } from "@/features/documents/hooks"
import { useIntegrations } from "@/features/settings/hooks"
import { formatDate, formatDateTime } from "@/lib/dates"
import { formatFileSize, initials } from "@/lib/format"
import { EMAIL_KIND_CLS } from "@/lib/category-colors"
import { cn } from "@/lib/utils"
import type { EmailRow, ReplyMode } from "@/services"
import { useEmailThread, useMarkThreadRead, useReplyEmail } from "./hooks"
import { EMAIL_AUDIENCE, useAttachmentDownload } from "./components/EmailList"
import { RecipientsInput } from "./components/RecipientsInput"

const MODE: Record<ReplyMode, { label: string; icon: AppIcon }> = {
  reply: { label: "Reply", icon: Reply },
  replyAll: { label: "Reply all", icon: ReplyAll },
  forward: { label: "Forward", icon: Forward },
}

interface Draft { mode: ReplyMode; messageId: string }

/** Gmail-style date: time for today, day + month this year, full date otherwise. */
function shortDate(iso: string) {
  const d = new Date(iso)
  return isToday(d) ? formatDate(iso, "HH:mm") : isThisYear(d) ? formatDate(iso, "dd MMM") : formatDate(iso, "dd MMM yyyy")
}
const senderName = (m: EmailRow) => (m.direction === "Inbound" ? m.fromName : m.sentByName === "Automatic" ? "Automatic email" : m.sentByName)
const snippet = (m: EmailRow) => m.body.replace(/\s+/g, " ").trim()

/** One conversation, read like a mail client: older messages collapse to a line, the latest is open, reply inline. */
export function EmailThreadPage() {
  const { threadId = "" } = useParams()
  const navigate = useNavigate()
  const q = useEmailThread(threadId)
  const markRead = useMarkThreadRead()
  const canReply = usePermission("emails", "create")
  const integrations = useIntegrations()
  const ownAddress = integrations.data?.find((i) => i.id === "smtp")?.config.sender ?? "operations@praveg.com"
  const messages = useMemo(() => q.data ?? [], [q.data])
  const hasUnread = messages.some((m) => m.unread)
  const lastId = messages[messages.length - 1]?.id

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)

  // the newest message and anything unread start open; new arrivals open too
  useEffect(() => {
    if (!lastId) return
    setExpanded((cur) => new Set([...cur, lastId, ...messages.filter((m) => m.unread).map((m) => m.id)]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId])

  useEffect(() => {
    if (hasUnread && !markRead.isPending) markRead.mutate(threadId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnread, threadId])

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/emails"))

  if (q.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (q.isError) {
    return (
      <PageContainer className="space-y-4">
        <Button variant="ghost" size="sm" onClick={back}><ArrowLeft /> Back</Button>
        {q.error.message.includes("not found")
          ? <div className="rounded-xl border bg-card"><EmptyState title="Conversation not found" description="It may have been removed, or it isn't visible to your role." action={<Button asChild variant="outline"><Link to="/emails">Back to emails</Link></Button>} /></div>
          : <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />}
      </PageContainer>
    )
  }

  const root = messages[0]!
  const audience = EMAIL_AUDIENCE[root.kind]
  const subject = root.subject.replace(/^((re|fwd?):\s*)+/i, "")
  const canSend = canReply && messages.some((m) => m.status !== "Scheduled")
  const toggle = (id: string) => setExpanded((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const start = (mode: ReplyMode, messageId = lastId!) => setDraft({ mode, messageId })

  // collapse a long run of closed messages in the middle into "N older messages", as mail clients do
  const hidden = new Set<string>()
  if (!showAll && messages.length > 3) {
    const middle = messages.slice(1, -1).filter((m) => !expanded.has(m.id))
    if (middle.length >= 2) for (const m of middle) hidden.add(m.id)
  }
  const firstHiddenIndex = messages.findIndex((m) => hidden.has(m.id))

  return (
    <PageContainer className="space-y-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={back} aria-label="Back to emails"><ArrowLeft /></Button>
        <Link to="/emails" className="text-sm text-muted-foreground hover:text-foreground">Emails</Link>
      </div>

      <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="thread-subject">
        <header className="space-y-2 px-4 pt-5 pb-4 sm:px-6">
          <h1 id="thread-subject" className="text-lg leading-snug font-semibold tracking-tight break-words sm:text-[22px]">{subject}</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={cn("rounded px-1.5 py-0.5 font-medium", audience.cls)}>{audience.label}</span>
            <span className={cn("rounded px-1.5 py-0.5", EMAIL_KIND_CLS[root.kind])}>{root.kind}</span>
            {root.projectId && (
              <Link to={`/projects/${root.projectId}?tab=emails`} className="max-w-full truncate rounded bg-primary-light px-1.5 py-0.5 font-medium text-primary-dark hover:underline" title={root.projectTitle ?? undefined}>
                {root.projectCode} · {root.projectTitle}
              </Link>
            )}
          </p>
        </header>

        <ol className="divide-y border-t" aria-label="Messages">
          {messages.map((m, i) => {
            if (hidden.has(m.id)) {
              return i === firstHiddenIndex ? (
                <li key="older">
                  <button type="button" onClick={() => setShowAll(true)} className="relative flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-primary-text hover:bg-muted/40 sm:px-6">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold tabular-nums">{hidden.size}</span>
                    {hidden.size} older message{hidden.size === 1 ? "" : "s"}
                  </button>
                </li>
              ) : null
            }
            return (
              <li key={m.id}>
                {expanded.has(m.id)
                  ? <OpenMessage m={m} ownAddress={ownAddress} onCollapse={messages.length > 1 ? () => toggle(m.id) : undefined} onAction={canSend ? (mode) => start(mode, m.id) : undefined} />
                  : <ClosedMessage m={m} onOpen={() => toggle(m.id)} />}
              </li>
            )
          })}
        </ol>

        {canSend && (
          <footer className="border-t px-4 py-4 sm:px-6">
            {draft ? (
              <Composer key={`${draft.mode}-${draft.messageId}`} draft={draft} messages={messages} ownAddress={ownAddress} onMode={(mode) => setDraft({ ...draft, mode })} onClose={() => setDraft(null)} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MODE) as ReplyMode[]).map((mode) => {
                  const M = MODE[mode]
                  return <Button key={mode} variant="outline" className="rounded-full" onClick={() => start(mode)}><M.icon /> {M.label}</Button>
                })}
              </div>
            )}
          </footer>
        )}
      </section>
    </PageContainer>
  )
}

function Avatar({ m, size = "md" }: { m: EmailRow; size?: "sm" | "md" }) {
  const inbound = m.direction === "Inbound"
  return (
    <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold", size === "sm" ? "size-8 text-[11px]" : "size-8 text-xs sm:size-10", inbound ? "bg-primary-light text-primary-dark" : "bg-muted text-muted-foreground")}>
      {initials(senderName(m))}
    </span>
  )
}

function ClosedMessage({ m, onOpen }: { m: EmailRow; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-6" aria-label={`Show message from ${senderName(m)}`}>
      <Avatar m={m} size="sm" />
      <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
        <p className={cn("truncate text-sm sm:w-44 sm:shrink-0", m.unread ? "font-semibold text-foreground" : "font-medium text-foreground")}>{senderName(m)}</p>
        <p className="truncate text-sm text-muted-foreground">{snippet(m)}</p>
      </div>
      {m.attachments.length > 0 && <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-label="Has attachments" />}
      <time className="shrink-0 text-xs whitespace-nowrap text-muted-foreground" dateTime={m.sentAt} title={formatDateTime(m.sentAt)}>{shortDate(m.sentAt)}</time>
    </button>
  )
}

function OpenMessage({ m, ownAddress, onCollapse, onAction }: { m: EmailRow; ownAddress: string; onCollapse?: () => void; onAction?: (mode: ReplyMode) => void }) {
  const [details, setDetails] = useState(false)
  const toLine = m.to.map((a) => (a.toLowerCase() === ownAddress.toLowerCase() ? "me" : a.split("@")[0])).join(", ")
  return (
    <article className="px-4 py-4 sm:px-6">
      <div className="flex items-start gap-3">
        <Avatar m={m} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button type="button" onClick={onCollapse} disabled={!onCollapse} className="min-w-0 flex-1 text-left disabled:cursor-default">
              <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                <span className="font-semibold text-foreground">{senderName(m)}</span>
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">&lt;{m.fromAddress}&gt;</span>
              </p>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {(m.status === "Scheduled" || m.status === "Failed") && <StatusBadge status={m.status} className="hidden sm:inline-flex" />}
              <time className="text-xs whitespace-nowrap text-muted-foreground" dateTime={m.sentAt} title={formatDateTime(m.sentAt)}>
                {m.status === "Scheduled" ? "Goes out " : ""}<span className="hidden sm:inline">{formatDateTime(m.sentAt)}</span><span className="sm:hidden">{shortDate(m.sentAt)}</span>
              </time>
              {onAction && (
                <>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => onAction("reply")} aria-label="Reply"><Reply /></Button>
                  <ActionMenu label="More message actions" items={[
                    { label: "Reply all", icon: ReplyAll, onSelect: () => onAction("replyAll") },
                    { label: "Forward", icon: Forward, onSelect: () => onAction("forward") },
                  ]} />
                </>
              )}
            </div>
          </div>
          <button type="button" onClick={() => setDetails((d) => !d)} className="inline-flex max-w-full items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground" aria-expanded={details}>
            <span className="truncate">to {toLine}{m.cc.length ? `, cc ${m.cc.length}` : ""}</span>
            <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", details && "rotate-180")} aria-hidden />
          </button>
          {details && (
            <dl className="mt-2 grid max-w-xl grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-md border bg-muted/40 p-3 text-xs">
              <dt className="text-muted-foreground">from</dt><dd className="break-words">{senderName(m)} &lt;{m.fromAddress}&gt;</dd>
              <dt className="text-muted-foreground">to</dt><dd className="break-words">{m.to.join(", ")}</dd>
              {m.cc.length > 0 && <><dt className="text-muted-foreground">cc</dt><dd className="break-words">{m.cc.join(", ")}</dd></>}
              {m.bcc.length > 0 && <><dt className="text-muted-foreground">bcc</dt><dd className="break-words">{m.bcc.join(", ")}</dd></>}
              <dt className="text-muted-foreground">date</dt><dd>{formatDateTime(m.sentAt)}</dd>
              <dt className="text-muted-foreground">subject</dt><dd className="break-words">{m.subject}</dd>
            </dl>
          )}
        </div>
      </div>
      <div className="mt-4 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground sm:pl-[3.25rem]">{m.body}</div>
      <AttachmentTiles m={m} />
    </article>
  )
}

function AttachmentTiles({ m }: { m: EmailRow }) {
  const dl = useAttachmentDownload()
  if (!m.attachments.length) return null
  const available = m.attachments.filter((a) => a.available)
  return (
    <div className="mt-5 space-y-2 border-t pt-4 sm:pl-[3.25rem]">
      <p className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>{m.attachments.length} attachment{m.attachments.length === 1 ? "" : "s"}</span>
        {available.length > 1 && (
          <button type="button" disabled={!!dl.busy} onClick={() => void dl.run(`all_${m.id}`, available.map((a) => a.id))} className="inline-flex items-center gap-1 text-primary-text hover:underline disabled:opacity-50">
            {dl.busy === `all_${m.id}` ? <Spinner /> : <Download className="size-3.5" aria-hidden />} Download all
          </button>
        )}
      </p>
      <ul className="grid gap-2 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]">
        {m.attachments.map((a) => (
          <li key={a.id}>
            <button type="button" disabled={!a.available || !!dl.busy} onClick={() => void dl.run(a.id, [a.id])} title={a.available ? `Download ${a.name}` : "File removed"}
              className="group flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-left transition hover:border-primary-strong/40 hover:bg-primary-light/40 disabled:opacity-50">
              <FileTypeIcon name={a.name} className="size-6" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.name}</span>
                <span className="block text-xs text-muted-foreground">{a.available ? formatFileSize(a.sizeKb) : "File removed"}</span>
              </span>
              {dl.busy === a.id ? <Spinner /> : <Download className="size-4 shrink-0 text-muted-foreground group-hover:text-primary-text" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function recipientsFor(mode: ReplyMode, target: EmailRow, own: string) {
  const self = own.toLowerCase()
  const inbound = target.direction === "Inbound"
  if (mode === "forward") return { to: [], cc: [] }
  const to = inbound ? [target.fromAddress] : target.to
  if (mode === "reply") return { to, cc: [] }
  const others = (inbound ? [...target.to, ...target.cc] : target.cc).filter((a) => a.toLowerCase() !== self && !to.includes(a))
  return { to, cc: [...new Set(others)] }
}

function forwardBody(m: EmailRow) {
  return `\n\n---------- Forwarded message ---------\nFrom: ${senderName(m)} <${m.fromAddress}>\nDate: ${formatDateTime(m.sentAt)}\nSubject: ${m.subject}\nTo: ${m.to.join(", ")}\n\n${m.body}`
}

function Composer({ draft, messages, ownAddress, onMode, onClose }: { draft: Draft; messages: EmailRow[]; ownAddress: string; onMode: (m: ReplyMode) => void; onClose: () => void }) {
  const reply = useReplyEmail()
  const integrations = useIntegrations()
  const smtp = integrations.data?.find((i) => i.id === "smtp")
  const smtpDown = smtp && smtp.state !== "Connected"
  const root = messages[0]!
  const target = messages.find((m) => m.id === draft.messageId) ?? messages[messages.length - 1]!
  const docs = useDocuments({ entityType: "Project", entityId: root.projectId ?? "" }, { enabled: !!root.projectId })

  const initial = recipientsFor(draft.mode, target, ownAddress)
  const [to, setTo] = useState<string[]>(initial.to)
  const [cc, setCc] = useState<string[]>(initial.cc)
  const [bcc, setBcc] = useState<string[]>([])
  const [showCc, setShowCc] = useState(initial.cc.length > 0)
  const [showBcc, setShowBcc] = useState(false)
  const [body, setBody] = useState(draft.mode === "forward" ? forwardBody(target) : "")
  const [attach, setAttach] = useState<Set<string>>(() => new Set(draft.mode === "forward" ? target.attachments.filter((a) => a.available).map((a) => a.id) : []))
  const [touched, setTouched] = useState(false)
  const errors = { to: !to.length ? "Add at least one recipient" : undefined, body: !body.trim() ? "Write a message" : undefined }

  // attachable: project documents plus anything already on the forwarded message
  const attachable = useMemo(() => {
    const m = new Map<string, { id: string; name: string; sizeKb: number; category: string }>()
    for (const a of target.attachments) if (a.available) m.set(a.id, a)
    for (const d of docs.data ?? []) m.set(d.id, { id: d.id, name: d.name, sizeKb: d.sizeKb, category: d.category })
    return [...m.values()]
  }, [docs.data, target.attachments])
  const byCategory = useMemo(() => {
    const m = new Map<string, typeof attachable>()
    for (const a of attachable) m.set(a.category, [...(m.get(a.category) ?? []), a])
    return [...m.entries()]
  }, [attachable])
  const selected = attachable.filter((a) => attach.has(a.id))
  const toggle = (id: string) => setAttach((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const submit = () => {
    setTouched(true)
    if (errors.to || errors.body || smtpDown) return
    reply.mutate({ threadId: root.threadId, mode: draft.mode, messageId: target.id, to, cc, bcc, body, attachmentIds: [...attach] }, { onSuccess: onClose })
  }
  const M = MODE[draft.mode]

  return (
    <div className="rounded-xl border shadow-sm">
      {smtpDown && (
        <Alert variant="destructive" className="rounded-b-none border-x-0 border-t-0">
          <AlertTriangle />
          <AlertTitle>SMTP is {smtp?.state.toLowerCase()}</AlertTitle>
          <AlertDescription>Emails can't be sent until the mail service is connected. <Link to="/settings/integrations" className="underline">Check integrations</Link></AlertDescription>
        </Alert>
      )}
      <div className="flex items-center gap-1 border-b px-2 py-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-2" aria-label={`${M.label} — change reply type`}><M.icon /> <ChevronDown className="size-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {(Object.keys(MODE) as ReplyMode[]).map((mode) => {
              const option = MODE[mode]
              return <DropdownMenuItem key={mode} onSelect={() => onMode(mode)}><option.icon /> {option.label}</DropdownMenuItem>
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="min-w-0 truncate text-xs text-muted-foreground">{draft.mode === "forward" ? "Fwd" : "Re"}: {root.subject.replace(/^((re|fwd?):\s*)+/i, "")}</span>
      </div>
      <RecipientsInput inline label="To" value={to} onChange={setTo} error={touched ? errors.to : undefined}
        trailing={(!showCc || !showBcc) && (
          <span className="flex shrink-0 gap-2 pt-1 text-sm text-muted-foreground">
            {!showCc && <button type="button" className="hover:text-foreground hover:underline" onClick={() => setShowCc(true)}>Cc</button>}
            {!showBcc && <button type="button" className="hover:text-foreground hover:underline" onClick={() => setShowBcc(true)}>Bcc</button>}
          </span>
        )} />
      {showCc && <RecipientsInput inline label="Cc" value={cc} onChange={setCc} />}
      {showBcc && <RecipientsInput inline label="Bcc" value={bcc} onChange={setBcc} />}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={draft.mode === "forward" ? 10 : 6}
        autoFocus
        placeholder="Write your message…"
        aria-label="Message"
        aria-invalid={touched && !!errors.body}
        className="block min-h-36 w-full resize-y bg-transparent px-3 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground"
      />
      {touched && errors.body && <p className="px-3 pb-2 text-xs text-destructive">{errors.body}</p>}
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pb-3">
          {selected.map((a) => (
            <li key={a.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/50 py-1 pr-1 pl-2 text-xs">
              <FileTypeIcon name={a.name} className="size-3.5" />
              <span className="truncate">{a.name}</span>
              <span className="shrink-0 text-muted-foreground">({formatFileSize(a.sizeKb)})</span>
              <button type="button" onClick={() => toggle(a.id)} className="shrink-0 rounded p-0.5 hover:bg-muted" aria-label={`Remove ${a.name}`}><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1 border-t px-2 py-2">
        <Button onClick={submit} disabled={reply.isPending || !!smtpDown} className="rounded-full px-5">{reply.isPending ? <Spinner /> : <Send />} Send</Button>
        {attachable.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Attach documents"><Paperclip /></Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-primary-dark uppercase">Attach documents</p>
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {byCategory.map(([category, docs]) => {
                  const picked = docs.filter((d) => attach.has(d.id)).length
                  const state = picked === docs.length ? true : picked ? "indeterminate" : false
                  return (
                    <div key={category}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                        <Checkbox
                          checked={state}
                          onCheckedChange={() => setAttach((s) => { const n = new Set(s); for (const d of docs) { if (state === true) n.delete(d.id); else n.add(d.id) } return n })}
                          aria-label={`Select all ${category}`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-[0.04em] text-primary-dark uppercase">{category}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{picked}/{docs.length}</span>
                      </label>
                      <ul>
                        {docs.map((d) => (
                          <li key={d.id}>
                            <label className="flex cursor-pointer items-center gap-3 rounded-md py-1.5 pr-2 pl-5 hover:bg-muted/60">
                              <Checkbox checked={attach.has(d.id)} onCheckedChange={() => toggle(d.id)} />
                              <FileTypeIcon name={d.name} className="size-5" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm">{d.name}</span>
                                <span className="block text-xs text-muted-foreground">{formatFileSize(d.sizeKb)}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button variant="ghost" size="icon" className="ml-auto" onClick={onClose} disabled={reply.isPending} aria-label="Discard draft"><Trash2 /></Button>
      </div>
    </div>
  )
}
