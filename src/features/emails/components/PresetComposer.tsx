import type { EmailDraft } from "@/services"
import type { EmailKind } from "@/types/domain"
import { useEmailPreset } from "@/features/projects/hooks"
import { EmailComposer } from "./EmailComposer"

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  projectId: string
  kind: EmailKind
  candidateIds?: string[]
  title: string
  description?: string
  sendLabel?: string
  sending: boolean
  onSend: (d: EmailDraft) => void
}

/**
 * Client-facing emails: recipients (client main email + To/CC/BCC contacts), template, merge fields and
 * suggested attachments come pre-filled from the project. The user can review and edit before sending.
 */
export function PresetComposer({ open, onOpenChange, projectId, kind, candidateIds = [], title, description, sendLabel, sending, onSend }: Props) {
  const preset = useEmailPreset(projectId, open ? kind : null, candidateIds)
  const p = preset.data
  return (
    <EmailComposer
      open={open && !!p}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      kind={kind}
      context={p?.context ?? {}}
      projectId={projectId}
      defaults={p?.defaults ?? { to: [] }}
      documents={p?.documents ?? []}
      suggestions={p?.suggestions}
      sending={sending}
      onSend={onSend}
      sendLabel={sendLabel}
    />
  )
}
