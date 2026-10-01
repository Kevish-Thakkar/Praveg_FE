import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation, WORKFLOW_KEYS } from "@/lib/query"
import { emailService, templateService, type EmailDraft, type ReplyInput } from "@/services"
import type { EmailKind, EmailTemplate } from "@/types/domain"

/** Polled so simulated replies show up in the inbox without a reload. */
const MAIL_POLL_MS = 15_000

export const useEmails = (filter: { projectId?: string; kind?: EmailKind } = {}) =>
  useQuery({ queryKey: [...qk.emails, filter], queryFn: () => emailService.list(filter), refetchInterval: MAIL_POLL_MS })
export const useEmailThread = (threadId: string) =>
  useQuery({ queryKey: [...qk.emails, "thread", threadId], queryFn: () => emailService.thread(threadId), refetchInterval: MAIL_POLL_MS })
export const useMarkThreadRead = () =>
  useAppMutation({ mutationFn: (threadId: string) => emailService.markThreadRead(threadId), invalidate: [qk.emails] })
export const useReplyEmail = () =>
  useAppMutation({ mutationFn: (input: ReplyInput) => emailService.reply(input), invalidate: [qk.emails, qk.activity, qk.notifications], success: (_, v) => (v.mode === "forward" ? "Email forwarded" : "Reply sent") })
export const useTemplates = () => useQuery({ queryKey: [...qk.templates], queryFn: templateService.list })
export const useSendEmail = () =>
  useAppMutation({ mutationFn: (d: EmailDraft) => emailService.send(d), invalidate: WORKFLOW_KEYS, success: "Email sent and saved" })
export const useUpdateTemplate = () =>
  useAppMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Pick<EmailTemplate, "subject" | "body" | "name"> }) => templateService.update(id, patch),
    invalidate: [qk.templates],
    success: "Template saved",
  })
