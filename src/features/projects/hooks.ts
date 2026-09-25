import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation, WORKFLOW_KEYS } from "@/lib/query"
import { projectService, type EmailDraft, type FileMeta, type ProjectInput } from "@/services"
import type { Address, ClientPricing, EmailKind } from "@/types/domain"

export const useProjects = () => useQuery({ queryKey: [...qk.projects, "list"], queryFn: projectService.list })
export const useProject = (id: string) => useQuery({ queryKey: [...qk.projects, id], queryFn: () => projectService.get(id), enabled: !!id })
export const useCandidates = (projectId: string) =>
  useQuery({ queryKey: [...qk.candidates, projectId], queryFn: () => projectService.candidates(projectId), enabled: !!projectId })
export const useInspectorMatches = (input: { site: Address | null; skills: string[]; projectId?: string; includeOutside: boolean; query?: string }) =>
  useQuery({
    queryKey: [...qk.inspectors, "matches", input],
    queryFn: () => projectService.matches({ ...input, site: input.site! }),
    enabled: !!input.site && !!input.site.city,
    placeholderData: (prev) => prev,
  })
export const useEmailPreset = (projectId: string, kind: EmailKind | null, candidateIds: string[] = []) =>
  useQuery({
    queryKey: [...qk.emails, "preset", projectId, kind, candidateIds],
    queryFn: () => projectService.emailPreset(projectId, kind!, candidateIds),
    enabled: !!projectId && !!kind,
  })

const W = WORKFLOW_KEYS

export const useCreateProject = () =>
  useAppMutation({
    mutationFn: ({ input, inspectorIds }: { input: ProjectInput; inspectorIds: string[] }) => projectService.create(input, inspectorIds),
    invalidate: W,
    success: (p, v) => (v.inspectorIds.length ? `${p.code} created — availability requested from ${v.inspectorIds.length} inspector(s)` : `Inquiry ${p.code} created`),
  })
export const useUpdateProject = (id: string) =>
  useAppMutation({ mutationFn: (patch: ProjectInput) => projectService.update(id, patch), invalidate: W, success: "Project updated" })
export const useDeleteProject = () => useAppMutation({ mutationFn: (id: string) => projectService.remove(id), invalidate: W, success: "Inquiry deleted" })
export const useCancelProject = () =>
  useAppMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => projectService.cancel(id, reason), invalidate: W, success: "Project cancelled" })

export const useRequestAvailability = () =>
  useAppMutation({
    mutationFn: ({ projectId, inspectorIds }: { projectId: string; inspectorIds: string[] }) => projectService.requestAvailability(projectId, inspectorIds),
    invalidate: W,
    success: (n) => `Availability & confirmation email sent to ${n} inspector(s)`,
  })
export const useRecordAvailability = () =>
  useAppMutation({
    mutationFn: ({ candidateId, availability }: { candidateId: string; availability: "Available" | "Not Available" }) => projectService.recordAvailability(candidateId, availability),
    invalidate: W,
    success: (_c, v) => `Marked ${v.availability.toLowerCase()}`,
  })
export const useRemoveCandidate = () =>
  useAppMutation({ mutationFn: (id: string) => projectService.removeCandidate(id), invalidate: W, success: "Inspector removed from this project" })

export const useRequestPricing = () =>
  useAppMutation({ mutationFn: (id: string) => projectService.requestPricing(id), invalidate: W, success: "Accounts has been asked to set the client price" })
export const useSetPricing = () =>
  useAppMutation({
    mutationFn: ({ projectId, pricing }: { projectId: string; pricing: Omit<ClientPricing, "setById" | "setAt"> }) => projectService.setPricing(projectId, pricing),
    invalidate: W,
    success: "Client price saved",
  })

export const useSendCvs = () =>
  useAppMutation({
    mutationFn: ({ projectId, candidateIds, email }: { projectId: string; candidateIds: string[]; email: EmailDraft }) => projectService.sendCvs(projectId, candidateIds, email),
    invalidate: W,
    success: "CVs sent to the client",
  })
export const useRecordDecision = () =>
  useAppMutation({
    mutationFn: ({ projectId, decision }: { projectId: string; decision: Parameters<typeof projectService.recordDecision>[1] }) => projectService.recordDecision(projectId, decision),
    invalidate: W,
    success: (_p, v) => (v.decision.mode === "Interview" ? "Interview scheduled — inspector notified" : "Client selection recorded"),
  })
export const useRecordInterview = () =>
  useAppMutation({
    mutationFn: ({ projectId, result }: { projectId: string; result: "Passed" | "Failed" }) => projectService.recordInterview(projectId, result),
    invalidate: W,
    success: (_p, v) => (v.result === "Passed" ? "Interview passed — assign the inspector" : "Interview failed — back to CVs sent"),
  })
export const useAssignInspector = () =>
  useAppMutation({ mutationFn: (id: string) => projectService.assignInspector(id), invalidate: W, success: "Inspector assigned — confirmation email sent" })
export const useScheduleJob = () =>
  useAppMutation({
    mutationFn: ({ projectId, dates }: { projectId: string; dates: string[] }) => projectService.scheduleJob(projectId, dates),
    invalidate: W,
    success: "Job scheduled — automatic reminder set for 1 day before",
  })
export const useSendJobReminder = () =>
  useAppMutation({ mutationFn: (id: string) => projectService.sendJobReminder(id), invalidate: W, success: "Reminder sent to the inspector" })
export const useMarkJobDone = () =>
  useAppMutation({ mutationFn: (id: string) => projectService.markJobDone(id), invalidate: W, success: "Job done — report request goes out tomorrow 09:00" })
export const useUploadReport = () =>
  useAppMutation({
    mutationFn: ({ projectId, files }: { projectId: string; files: FileMeta[] }) => projectService.uploadReport(projectId, files),
    invalidate: W,
    success: "Report uploaded",
  })
export const useSendCompletion = () =>
  useAppMutation({
    mutationFn: ({ projectId, email }: { projectId: string; email: EmailDraft }) => projectService.sendCompletion(projectId, email),
    invalidate: W,
    success: "Completion email sent — project completed, Accounts notified",
  })
