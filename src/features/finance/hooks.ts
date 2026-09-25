import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { billingService, timeService, type EmailDraft, type FileMeta, type InvoiceInput, type PaymentInput } from "@/services"
import type { TimeEntry } from "@/types/domain"

const FIN = [qk.billing, qk.projects, qk.purchaseOrders, qk.dashboard, qk.activity, qk.documents, qk.emails, qk.notifications]

export const useBilling = () => useQuery({ queryKey: [...qk.billing, "list"], queryFn: billingService.list })
export const useBillingSummary = () => useQuery({ queryKey: [...qk.billing, "summary"], queryFn: billingService.summary })
export const useIncome = (enabled = true) => useQuery({ queryKey: [...qk.billing, "income"], queryFn: billingService.income, enabled })

export const useUploadInvoice = () =>
  useAppMutation({
    mutationFn: ({ projectId, input, file }: { projectId: string; input: InvoiceInput; file: FileMeta }) => billingService.uploadInvoice(projectId, input, file),
    invalidate: FIN,
    success: (r) => `Invoice ${r.invoice?.number} recorded — due ${r.invoice?.dueDate}`,
  })
export const useSendPaymentEmail = () =>
  useAppMutation({
    mutationFn: ({ projectId, kind, email }: { projectId: string; kind: "Reminder" | "Follow-up"; email: EmailDraft }) => billingService.sendPaymentEmail(projectId, kind, email),
    invalidate: FIN,
    success: (_r, v) => `Payment ${v.kind.toLowerCase()} sent`,
  })
export const useConfirmPayment = () =>
  useAppMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: PaymentInput }) => billingService.confirmPayment(projectId, input),
    invalidate: FIN,
    success: "Payment confirmed",
  })

export const useTimeEntries = () => useQuery({ queryKey: [...qk.time], queryFn: timeService.list })
export const useCreateTimeEntry = () =>
  useAppMutation({ mutationFn: (t: Omit<TimeEntry, "id" | "status">) => timeService.create(t), invalidate: [qk.time], success: "Time & expense entry submitted" })
export const useSetTimeStatus = () =>
  useAppMutation({
    mutationFn: ({ id, status }: { id: string; status: TimeEntry["status"] }) => timeService.setStatus(id, status),
    invalidate: [qk.time],
    success: (_t, v) => `Entry ${v.status.toLowerCase()}`,
  })
