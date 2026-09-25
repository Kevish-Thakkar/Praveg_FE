import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation, WORKFLOW_KEYS } from "@/lib/query"
import { emailService, templateService, type EmailDraft } from "@/services"
import type { EmailKind, EmailTemplate } from "@/types/domain"

export const useEmails = (filter: { projectId?: string; kind?: EmailKind } = {}) =>
  useQuery({ queryKey: [...qk.emails, filter], queryFn: () => emailService.list(filter) })
export const useTemplates = () => useQuery({ queryKey: [...qk.templates], queryFn: templateService.list })
export const useSendEmail = () =>
  useAppMutation({ mutationFn: (d: EmailDraft) => emailService.send(d), invalidate: WORKFLOW_KEYS, success: "Email sent and saved" })
export const useUpdateTemplate = () =>
  useAppMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Pick<EmailTemplate, "subject" | "body" | "name"> }) => templateService.update(id, patch),
    invalidate: [qk.templates],
    success: "Template saved",
  })
