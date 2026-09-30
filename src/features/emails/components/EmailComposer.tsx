import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, FileText, Paperclip, Send, Upload } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatFileSize, toFileMeta } from "@/lib/format"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { useUploadDocuments } from "@/features/documents/hooks"
import { renderTemplate, type MergeContext } from "@/lib/email-merge"
import { useIntegrations } from "@/features/settings/hooks"
import type { EmailDraft } from "@/services"
import type { EmailKind } from "@/types/domain"
import { useTemplates } from "../hooks"
import { RecipientsInput } from "./RecipientsInput"

export interface ComposerDefaults {
  to: string[]
  cc?: string[]
  bcc?: string[]
  attachmentIds?: string[]
  templateId?: string
}

export interface AttachableDocument {
  id: string
  name: string
  category: string
  sizeKb: number
  /** e.g. "Project documents", "Inspector CVs & certificates" */
  group?: string
  /** suited to this email — shown first and tagged */
  suggested?: boolean
}

interface EmailComposerProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description?: string
  kind: EmailKind
  context: MergeContext
  projectId: string | null
  defaults: ComposerDefaults
  documents: AttachableDocument[]
  suggestions?: { email: string; name: string }[]
  sending: boolean
  onSend: (draft: EmailDraft) => void
  sendLabel?: string
}

/**
 * Email workflow with dynamic client / project / inspector / date fields and
 * explicit document selection (never "send everything").
 */
export function EmailComposer({ open, onOpenChange, title, description, kind, context, projectId, defaults, documents, suggestions, sending, onSend, sendLabel = "Send email" }: EmailComposerProps) {
  const templates = useTemplates()
  const integrations = useIntegrations()
  const smtp = integrations.data?.find((i) => i.id === "smtp")
  const smtpDown = smtp && smtp.state !== "Connected"

  const [templateId, setTemplateId] = useState<string>("")
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [attachments, setAttachments] = useState<Set<string>>(new Set())
  const [touched, setTouched] = useState(false)

  // every template is available; the ones written for this kind of email are listed first
  const kindTemplates = useMemo(() => (templates.data ?? []).filter((t) => t.kind === kind), [templates.data, kind])
  const otherTemplates = useMemo(() => (templates.data ?? []).filter((t) => t.kind !== kind), [templates.data, kind])
  const [uploaded, setUploaded] = useState<AttachableDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const upload = useUploadDocuments()
  const allDocs = useMemo(() => [...uploaded, ...documents], [uploaded, documents])
  const groups = useMemo(() => {
    const m = new Map<string, AttachableDocument[]>()
    const suggested = allDocs.filter((d) => d.suggested)
    if (suggested.length) m.set("Suggested for this email", suggested)
    for (const d of allDocs.filter((x) => !x.suggested)) { const g = d.group ?? "Documents"; m.set(g, [...(m.get(g) ?? []), d]) }
    return [...m.entries()]
  }, [allDocs])

  // Initialise when opened
  useEffect(() => {
    if (!open) return
    setTo(defaults.to)
    setCc(defaults.cc ?? [])
    setBcc(defaults.bcc ?? [])
    setAttachments(new Set(defaults.attachmentIds ?? []))
    setTouched(false)
    setTemplateId(defaults.templateId ?? "")
    setUploaded([])
    setUploading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Client data can arrive after the composer opens — fill empty recipient fields once it does
  const defaultsKey = `${defaults.to.join(",")}|${(defaults.cc ?? []).join(",")}|${(defaults.bcc ?? []).join(",")}`
  useEffect(() => {
    if (!open) return
    setTo((cur) => (cur.length ? cur : defaults.to))
    setCc((cur) => (cur.length ? cur : defaults.cc ?? []))
    setBcc((cur) => (cur.length ? cur : defaults.bcc ?? []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultsKey, open])

  // Apply template when it is chosen (merge fields resolved from the context at that moment).
  // The context is read through a ref so later re-renders never overwrite the user's edits.
  const contextRef = useRef(context)
  useEffect(() => {
    contextRef.current = context
  }, [context])
  useEffect(() => {
    if (!open) return
    const t = templates.data?.find((x) => x.id === templateId)
    if (!t) return
    setSubject(renderTemplate(t.subject, contextRef.current))
    setBody(renderTemplate(t.body, contextRef.current))
  }, [templateId, templates.data, open])

  const errors = {
    to: !to.length ? "Add at least one recipient" : undefined,
    subject: !subject.trim() ? "Subject is required" : undefined,
    body: !body.trim() ? "Message is required" : undefined,
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const unresolved = /\{\{[^}]+\}\}/.test(subject + body)

  const toggle = (id: string) => setAttachments((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const submit = () => {
    setTouched(true)
    if (hasErrors || smtpDown) return
    onSend({ kind, projectId, subject, to, cc, bcc, body, attachmentIds: [...attachments], templateId: templateId || null })
  }

  return (
    <DetailDrawer
      open={open}
      onOpenChange={(o) => !sending && onOpenChange(o)}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>Cancel</Button>
          <Button onClick={submit} disabled={sending || !!smtpDown}>
            {sending ? <Spinner /> : <Send />} {sendLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {smtpDown && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>SMTP is {smtp?.state.toLowerCase()}</AlertTitle>
            <AlertDescription>
              Emails can't be sent until the mail service is connected. <Link to="/settings/integrations" className="underline">Check integrations</Link>
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="tpl">Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="tpl" className="w-full"><SelectValue placeholder={templates.isPending ? "Loading templates…" : "Choose a template"} /></SelectTrigger>
            <SelectContent>
              {kindTemplates.length > 0 && (
                <SelectGroup>
                  <SelectLabel>For this email</SelectLabel>
                  {kindTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectGroup>
              )}
              {kindTemplates.length > 0 && otherTemplates.length > 0 && <SelectSeparator />}
              {otherTemplates.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Other templates</SelectLabel>
                  {otherTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} <span className="text-muted-foreground">· {t.kind}</span></SelectItem>)}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Client, project, inspector, price and date details are filled in automatically.</p>
        </div>
        <RecipientsInput label="To" value={to} onChange={setTo} suggestions={suggestions} error={touched ? errors.to : undefined} />
        <div className="grid gap-4 sm:grid-cols-2">
          <RecipientsInput label="CC" value={cc} onChange={setCc} />
          <RecipientsInput label="BCC" value={bcc} onChange={setBcc} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-invalid={touched && !!errors.subject} />
          {touched && errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} rows={11} className="font-mono text-[13px] leading-relaxed" aria-invalid={touched && !!errors.body} />
          {touched && errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
          {unresolved && <p className="text-xs text-warning">Some placeholders could not be filled — review before sending.</p>}
        </div>
        <fieldset className="space-y-2">
          <legend className="flex w-full items-center justify-between gap-2 text-sm font-medium">
            <span className="flex items-center gap-2"><Paperclip className="size-4" /> Attachments <span className="font-normal text-muted-foreground">({attachments.size} of {allDocs.length} selected)</span></span>
            {projectId && <Button type="button" size="sm" variant="ghost" onClick={() => setUploading((u) => !u)}><Upload /> {uploading ? "Close" : "Upload new file"}</Button>}
          </legend>
          {uploading && projectId && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <FileDropzone files={[]} onChange={(files) => {
                if (!files.length) return
                upload.mutate({ files: files.map(toFileMeta), category: "Out Document", entityType: "Project", entityId: projectId, access: "Internal" }, {
                  onSuccess: (docs) => {
                    setUploaded((u) => [...docs.map((d) => ({ id: d.id, name: d.name, category: d.category, sizeKb: d.sizeKb, group: "Project documents", suggested: true })), ...u])
                    setAttachments((a) => new Set([...a, ...docs.map((d) => d.id)]))
                    setUploading(false)
                  },
                })
              }} hint="Saved to the project's documents as an out document and attached to this email" />
              {upload.isPending && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Spinner /> Uploading…</p>}
            </div>
          )}
          {allDocs.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No documents available for this project yet.</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border p-2">
              {groups.map(([g, docs]) => (
                <div key={g}>
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.04em] text-primary-dark uppercase">{g}</p>
                  <ul>
                    {docs.map((d) => (
                      <li key={d.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/60">
                          <Checkbox checked={attachments.has(d.id)} onCheckedChange={() => toggle(d.id)} />
                          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm">{d.name}</span>
                            <span className="block text-xs text-muted-foreground">{d.category} · {formatFileSize(d.sizeKb)}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </DetailDrawer>
  )
}
