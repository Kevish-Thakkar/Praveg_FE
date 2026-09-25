import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { inspectorService, type FileMeta, type InspectorInput } from "@/services"

export const useInspectors = () => useQuery({ queryKey: [...qk.inspectors, "list"], queryFn: inspectorService.list })
export const useInspector = (id: string) => useQuery({ queryKey: [...qk.inspectors, id], queryFn: () => inspectorService.get(id), enabled: !!id })
export const useInspectorJobs = (id: string) => useQuery({ queryKey: [...qk.inspectors, id, "jobs"], queryFn: () => inspectorService.jobs(id), enabled: !!id })

export const useSaveInspector = () =>
  useAppMutation({
    mutationFn: ({ id, input, cv }: { id?: string; input: InspectorInput; cv: FileMeta | null }) => (id ? inspectorService.update(id, input, cv) : inspectorService.create(input, cv!)),
    invalidate: [qk.inspectors, qk.masters, qk.documents, qk.search, qk.activity],
    success: (_i, v) => (v.id ? "Inspector updated" : "Inspector added with CV"),
  })
export const useDeleteInspector = () =>
  useAppMutation({ mutationFn: (id: string) => inspectorService.remove(id), invalidate: [qk.inspectors, qk.search], success: "Inspector deleted" })
