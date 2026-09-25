import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import {
  currencyService, integrationService, organizationService, projectTypeService, settingsService, skillService, userService,
} from "@/services"
import type { Currency, Integration, Organization, ProjectType, User } from "@/types/domain"

export const useOrganizations = () => useQuery({ queryKey: [...qk.masters, "orgs"], queryFn: organizationService.list })
export const useCurrencies = () => useQuery({ queryKey: [...qk.masters, "currencies"], queryFn: currencyService.list })
export const useProjectTypes = () => useQuery({ queryKey: [...qk.masters, "projectTypes"], queryFn: projectTypeService.list })
export const useUsers = () => useQuery({ queryKey: [...qk.users], queryFn: userService.list })
export const useSkills = () => useQuery({ queryKey: [...qk.masters, "skills"], queryFn: skillService.list })
export const useAddSkill = () =>
  useAppMutation({ mutationFn: (s: string) => skillService.add(s), invalidate: [qk.masters], success: (s) => `Skill "${s}" added` })
export const useSettings = () => useQuery({ queryKey: [...qk.masters, "settings"], queryFn: settingsService.get })
export const useIntegrations = () => useQuery({ queryKey: [...qk.integrations], queryFn: integrationService.list })

export const useSaveOrganization = () =>
  useAppMutation({
    mutationFn: ({ id, input }: { id?: string; input: Omit<Organization, "id"> }) => (id ? organizationService.update(id, input) : organizationService.create(input)),
    invalidate: [qk.masters],
    success: (_o, v) => (v.id ? "Organization updated" : "Organization added"),
  })
export const useSaveProjectType = () =>
  useAppMutation({
    mutationFn: ({ id, input }: { id?: string; input: Omit<ProjectType, "id"> }) => (id ? projectTypeService.update(id, input) : projectTypeService.create(input)),
    invalidate: [qk.masters, qk.projects],
    success: (_o, v) => (v.id ? "Project type updated" : "Project type added"),
  })
export const useDeleteProjectType = () =>
  useAppMutation({ mutationFn: (id: string) => projectTypeService.remove(id), invalidate: [qk.masters], success: "Project type deleted" })
export const useAddCurrency = () =>
  useAppMutation({ mutationFn: (c: Currency) => currencyService.create(c), invalidate: [qk.masters], success: (c) => `${c.code} added` })
export const useRemoveCurrency = () =>
  useAppMutation({ mutationFn: (code: string) => currencyService.remove(code), invalidate: [qk.masters], success: "Currency removed" })

export const useInviteUser = () =>
  useAppMutation({
    mutationFn: (u: Pick<User, "name" | "email" | "role" | "organizationId" | "phone">) => userService.invite(u),
    invalidate: [qk.users, qk.activity],
    success: (u) => `Invitation sent to ${u.email}`,
  })
export const useUpdateUser = () =>
  useAppMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<User> }) => userService.update(id, patch),
    invalidate: [qk.users],
    success: "User updated",
  })
export const useUpdateSettings = () =>
  useAppMutation({ mutationFn: settingsService.update, invalidate: [qk.masters], success: "Settings saved" })

export const useSaveIntegration = () =>
  useAppMutation({
    mutationFn: ({ id, config }: { id: Integration["id"]; config: Record<string, string> }) => integrationService.saveConfig(id, config),
    invalidate: [qk.integrations],
    success: "Configuration saved — test the connection to activate it",
  })
export const useTestIntegration = () =>
  useAppMutation({ mutationFn: (id: Integration["id"]) => integrationService.test(id), invalidate: [qk.integrations], success: (it) => `${it.name}: ${it.state}` })
export const useDisconnectIntegration = () =>
  useAppMutation({ mutationFn: (id: Integration["id"]) => integrationService.disconnect(id), invalidate: [qk.integrations], success: "Integration disconnected" })
