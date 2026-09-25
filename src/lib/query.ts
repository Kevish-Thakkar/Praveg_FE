import { QueryClient, useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import { ApiError } from "@/services/api"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
      refetchOnWindowFocus: false,
    },
  },
})

/** Query-key roots. Every key starts with one of these so invalidation stays predictable. */
export const qk = {
  dashboard: ["dashboard"],
  projects: ["projects"],
  candidates: ["candidates"],
  billing: ["billing"],
  purchaseOrders: ["purchaseOrders"],
  visits: ["visits"],
  reminders: ["reminders"],
  notifications: ["notifications"],
  documents: ["documents"],
  emails: ["emails"],
  templates: ["templates"],
  clients: ["clients"],
  vendors: ["vendors"],
  inspectors: ["inspectors"],
  time: ["time"],
  masters: ["masters"],
  users: ["users"],
  integrations: ["integrations"],
  activity: ["activity"],
  search: ["search"],
} as const satisfies Record<string, QueryKey>

/** Workflow steps touch many derived views (project stage, dashboard, POs…) */
export const WORKFLOW_KEYS: QueryKey[] = [
  qk.dashboard, qk.projects, qk.candidates, qk.purchaseOrders, qk.visits, qk.reminders,
  qk.notifications, qk.emails, qk.documents, qk.activity, qk.billing, qk.inspectors, qk.clients, qk.search,
]

interface AppMutationOptions<TData, TVars> {
  mutationFn: (vars: TVars) => Promise<TData>
  invalidate: QueryKey[]
  success?: string | ((data: TData, vars: TVars) => string)
  onSuccess?: (data: TData, vars: TVars) => void
}

/** Mutation with consistent toasts + invalidation. */
export function useAppMutation<TData, TVars = void>({ mutationFn, invalidate, success, onSuccess }: AppMutationOptions<TData, TVars>) {
  const qc = useQueryClient()
  return useMutation<TData, Error, TVars>({
    mutationFn,
    onSuccess: async (data, vars) => {
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })))
      if (success) toast.success(typeof success === "function" ? success(data, vars) : success)
      onSuccess?.(data, vars)
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong")
    },
  })
}
