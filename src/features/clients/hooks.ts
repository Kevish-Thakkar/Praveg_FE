import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { clientService, type ClientInput } from "@/services"
import type { ClientContact } from "@/types/domain"

export const useClients = () => useQuery({ queryKey: [...qk.clients, "list"], queryFn: clientService.list })
export const useClient = (id: string) => useQuery({ queryKey: [...qk.clients, id], queryFn: () => clientService.get(id), enabled: !!id })

export const useSaveClient = () =>
  useAppMutation({
    mutationFn: ({ id, input }: { id?: string; input: ClientInput }) => (id ? clientService.update(id, input) : clientService.create(input)),
    invalidate: [qk.clients, qk.projects, qk.search, qk.activity],
    success: (_c, v) => (v.id ? "Client updated" : "Client added"),
  })
export const useDeleteClient = () =>
  useAppMutation({ mutationFn: (id: string) => clientService.remove(id), invalidate: [qk.clients, qk.vendors, qk.search], success: "Client deleted" })
export const useSaveContact = (clientId: string) =>
  useAppMutation({
    mutationFn: (c: Omit<ClientContact, "id"> & { id?: string }) => clientService.saveContact(clientId, c),
    invalidate: [qk.clients],
    success: (_r, v) => (v.id ? "Contact updated" : "Contact added"),
  })
export const useRemoveContact = (clientId: string) =>
  useAppMutation({ mutationFn: (contactId: string) => clientService.removeContact(clientId, contactId), invalidate: [qk.clients], success: "Contact removed" })
