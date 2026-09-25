import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { vendorService, type VendorInput } from "@/services"

export const useVendors = (clientId?: string) =>
  useQuery({ queryKey: [...qk.vendors, "list", clientId ?? "all"], queryFn: () => vendorService.list({ clientId }) })

export const useSaveVendor = () =>
  useAppMutation({
    mutationFn: ({ id, input }: { id?: string; input: VendorInput }) => (id ? vendorService.update(id, input) : vendorService.create(input)),
    invalidate: [qk.vendors, qk.clients, qk.projects, qk.search],
    success: (_v, vars) => (vars.id ? "Vendor updated" : "Vendor added"),
  })
export const useDeleteVendor = () =>
  useAppMutation({ mutationFn: (id: string) => vendorService.remove(id), invalidate: [qk.vendors, qk.clients, qk.search], success: "Vendor deleted" })
