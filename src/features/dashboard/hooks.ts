import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query"
import { activityService, dashboardService, searchService } from "@/services"

export const useDashboard = (scope: "all" | "mine") =>
  useQuery({ queryKey: [...qk.dashboard, scope], queryFn: () => dashboardService.get(scope) })
export const useActivity = (filter: { projectId?: string; limit?: number } = {}) =>
  useQuery({ queryKey: [...qk.activity, filter], queryFn: () => activityService.list(filter) })
export const useSearchIndex = (enabled: boolean) =>
  useQuery({ queryKey: [...qk.search], queryFn: searchService.all, enabled, staleTime: 60_000 })
