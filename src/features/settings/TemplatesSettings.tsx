import { useRef, useState } from "react"
import { Mail, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SectionHeader } from "@/components/common/SectionHeader"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { DetailDrawer } from "@/components/dialogs/DetailDrawer"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Spinner, TableSkeleton } from "@/components/feedback/LoadingState"
import { MERGE_FIELDS } from "@/lib/email-merge"
import { formatDateTime } from "@/lib/dates"
import type { EmailTemplate } from "@/types/domain"
import { useTemplates, useUpdateTemplate } from "@/features/emails/hooks"

export function TemplatesSettings() {
  const q = useTemplates()
  const canEdit = usePermission("settings", "edit")
  const [editing, setEditing] = useState<EmailTemplate | null>(null)
  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4"><SectionHeader title="Email templates" description="Used by the quotation, inspector confirmation, out-document and reminder email flows." /></div>
        {q.isPending ? <TableSkeleton rows={4} columns={2} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <ul className="divide-y">
            {q.data.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-4 py-3">
                <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1"><p className="font-medium">{t.name}</p><p className="truncate text-xs text-muted-foreground">{t.subject}</p></div>
                <StatusBadge status={t.kind} tone="info" dot={false} />
                <span className="hidden text-xs text-muted-foreground md:inline">Updated {formatDateTime(t.updatedAt)}</span>
                {canEdit && <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><Pencil /></Button>}
              </li>
            ))}
          </ul>
        )}
      </Card>
      {editing && <TemplateEditor key={editing.id} template={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TemplateEditor({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const update = useUpdateTemplate()
  const [name, setName] = useState(template.name)
  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const insert = (key: string) => {
    const el = bodyRef.current
    const token = `{{${key}}}`
    if (!el) return setBody((b) => b + token)
    const s = el.selectionStart
    const next = body.slice(0, s) + token + body.slice(el.selectionEnd)
    setBody(next)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length) })
  }
  const invalid = !name.trim() || !subject.trim() || !body.trim()
  return (
    <DetailDrawer open onOpenChange={(o) => !o && onClose()} title="Edit template" description={template.kind} size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={update.isPending}>Cancel</Button><Button disabled={invalid || update.isPending} onClick={() => update.mutate({ id: template.id, patch: { name, subject, body } }, { onSuccess: onClose })}>{update.isPending && <Spinner />} Save template</Button></>}>
      <div className="space-y-4">
        <div className="space-y-1.5"><Label htmlFor="tname">Name</Label><Input id="tname" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="tsubj">Subject</Label><Input id="tsubj" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="tbody">Body</Label><Textarea id="tbody" ref={bodyRef} rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-[13px]" /></div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Insert merge field</p>
          <div className="flex flex-wrap gap-1.5">{MERGE_FIELDS.map((f) => <Button key={f.key} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => insert(f.key)}>{f.label}</Button>)}</div>
        </div>
      </div>
    </DetailDrawer>
  )
}
