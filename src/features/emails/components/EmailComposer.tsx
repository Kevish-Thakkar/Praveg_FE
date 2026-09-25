import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, FileText, Paperclip, Send } from "lucide-react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatFileSize } from "@/lib/format"
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

  const kindTemplates = useMemo(() => (templates.data ?? []).filter((t) => t.kind === kind || kind === "General"), [templates.data, kind])

  // Initialise when opened
  useEffect(() => {
    if (!open) return
    setTo(defaults.to)
    setCc(defaults.cc ?? [])
    setBcc(defaults.bcc ?? [])
    setAttachments(new Set(defaults.attachmentIds ?? []))
    setTouched(false)
    setTemplateId(defaults.templateId ?? "")
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
              {kindTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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
          <legend className="flex items-center gap-2 text-sm font-medium"><Paperclip className="size-4" /> Attachments <span className="font-normal text-muted-foreground">({attachments.size} selected)</span></legend>
          {documents.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No documents available for this project yet.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {documents.map((d) => (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/60">
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
          )}
        </fieldset>
      </div>
    </DetailDrawer>
  )
}
