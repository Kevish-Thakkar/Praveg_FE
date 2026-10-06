import { useMemo } from "react"
import { useClients } from "@/features/clients/hooks"
import { useVendors } from "@/features/vendors/hooks"
import { useInspectors } from "@/features/inspectors/hooks"
import { useCurrencies, useOrganizations, useProjectTypes, useSkills, useUsers } from "./hooks"
import type { Option } from "@/components/forms/fields"

/** Option lists for forms — memoised so field components get stable arrays. */
export function useLookupOptions() {
  const clients = useClients()
  const vendors = useVendors()
  const orgs = useOrganizations()
  const types = useProjectTypes()
  const users = useUsers()
  const currencies = useCurrencies()
  const inspectors = useInspectors()
  const skills = useSkills()

  return useMemo(() => {
    const clientOptions: Option[] = (clients.data ?? []).map((c) => ({ value: c.id, label: c.name, hint: `${c.address.city}, ${c.address.state}` }))
    const vendorOptions: Option[] = (vendors.data ?? []).map((v) => ({ value: v.id, label: v.name, hint: `${v.address.city}, ${v.address.state}` }))
    const orgOptions: Option[] = (orgs.data ?? []).map((o) => ({ value: o.id, label: o.name }))
    const typeOptions: Option[] = (types.data ?? []).map((t) => ({ value: t.id, label: t.name, hint: t.category }))
    const coordinatorOptions: Option[] = (users.data ?? []).filter((u) => (u.role === "Coordinator" || u.role === "Super Admin") && u.status !== "Disabled").map((u) => ({ value: u.id, label: `${u.name} · ${u.role}` }))
    const userOptions: Option[] = (users.data ?? []).filter((u) => u.status !== "Disabled").map((u) => ({ value: u.id, label: `${u.name} · ${u.role}` }))
    const currencyOptions: Option[] = (currencies.data ?? []).map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` }))
    const inspectorOptions: Option[] = (inspectors.data ?? []).map((i) => ({ value: i.id, label: i.name, hint: `${i.skills.slice(0, 3).join(", ")} · ${i.address.city}` }))
    const skillOptions: Option[] = (skills.data ?? []).map((s) => ({ value: s, label: s }))
    return {
      clientOptions, vendorOptions, orgOptions, typeOptions, coordinatorOptions, userOptions, currencyOptions, inspectorOptions, skillOptions,
      clients: clients.data ?? [], vendors: vendors.data ?? [], types: types.data ?? [], inspectors: inspectors.data ?? [],
      isPending: clients.isPending || vendors.isPending || orgs.isPending || types.isPending || users.isPending || currencies.isPending,
    }
  }, [clients.data, vendors.data, orgs.data, types.data, users.data, currencies.data, inspectors.data, skills.data, clients.isPending, vendors.isPending, orgs.isPending, types.isPending, users.isPending, currencies.isPending])
}
