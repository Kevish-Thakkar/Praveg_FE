import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation, WORKFLOW_KEYS } from "@/lib/query"
import { poService, visitService, type POInput, type RescheduleInput, type VisitInput } from "@/services"

export const usePOs = () => useQuery({ queryKey: [...qk.purchaseOrders, "list"], queryFn: poService.list })
export const useSavePO = () =>
  useAppMutation({ mutationFn: ({ projectId, input }: { projectId: string; input: POInput }) => poService.save(projectId, input), invalidate: [qk.purchaseOrders, qk.billing, qk.activity, qk.dashboard], success: "Purchase order saved" })

export const useVisits = (projectId?: string) => useQuery({ queryKey: [...qk.visits, projectId ?? "all"], queryFn: () => visitService.list({ projectId }) })
export const useScheduleVisit = () =>
  useAppMutation({ mutationFn: (input: VisitInput) => visitService.schedule(input), invalidate: WORKFLOW_KEYS, success: "Visit scheduled" })
export const useCompleteVisit = () =>
  useAppMutation({ mutationFn: ({ id, data }: { id: string; data: { unitsSpent: number; expenses: number; notes: string } }) => visitService.complete(id, data), invalidate: WORKFLOW_KEYS, success: "Visit completed" })
export const useRescheduleVisit = () =>
  useAppMutation({ mutationFn: ({ id, input }: { id: string; input: RescheduleInput }) => visitService.reschedule(id, input), invalidate: WORKFLOW_KEYS, success: "Visit rescheduled" })
export const useCancelVisit = () => useAppMutation({ mutationFn: (id: string) => visitService.cancel(id), invalidate: WORKFLOW_KEYS, success: "Visit cancelled" })
