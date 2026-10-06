import { useQuery } from "@tanstack/react-query"
import { qk, useAppMutation } from "@/lib/query"
import { vendorService, type VendorInput } from "@/services"

/** All vendors — vendors are not owned by a client; a project can involve several. */
export const useVendors = () => useQuery({ queryKey: [...qk.vendors, "list"], queryFn: () => vendorService.list() })

export const useSaveVendor = () =>
  useAppMutation({
    mutationFn: ({ id, input }: { id?: string; input: VendorInput }) => (id ? vendorService.update(id, input) : vendorService.create(input)),
    invalidate: [qk.vendors, qk.clients, qk.projects, qk.search],
    success: (_v, vars) => (vars.id ? "Vendor updated" : "Vendor added"),
  })
export const useDeleteVendor = () =>
  useAppMutation({ mutationFn: (id: string) => vendorService.remove(id), invalidate: [qk.vendors, qk.clients, qk.projects, qk.search], success: "Vendor deleted" })
