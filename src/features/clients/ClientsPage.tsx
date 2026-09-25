import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { COUNTRIES } from "@/constants/geo"
import type { ClientRow } from "@/services"
import { useClients, useSaveClient } from "./hooks"
import { ClientFormDrawer } from "./components/ClientFormDrawer"

export function ClientsPage() {
  const navigate = useNavigate()
  const { data = [], isPending, isError, error, refetch } = useClients()
  const save = useSaveClient()
  const canCreate = usePermission("clients", "create")
  const [search, setSearch] = useState("")
  const [country, setCountry] = useState(ALL)
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return data.filter((c) => (country === ALL || c.address.country === country) && (!s || `${c.name} ${c.email} ${c.address.city} ${c.address.state} ${c.contacts.map((x) => x.name).join(" ")}`.toLowerCase().includes(s)))
  }, [data, search, country])
  const columns = useMemo<Column<ClientRow>[]>(() => [
    { id: "name", header: "Client", sortValue: (c) => c.name, cell: (c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.email}</p></div> },
    { id: "loc", header: "Location", hideBelow: "md", sortValue: (c) => c.address.city, cell: (c) => <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted-foreground" aria-hidden />{c.address.city}, {c.address.state}</span> },
    { id: "terms", header: "Payment terms", hideBelow: "lg", sortValue: (c) => c.paymentTermsDays, cell: (c) => `${c.paymentTermsDays} days · ${c.currency}` },
    { id: "vendors", header: "Vendors", align: "right", hideBelow: "sm", sortValue: (c) => c.vendorCount, cell: (c) => <span className="tabular-nums">{c.vendorCount}</span> },
    { id: "open", header: "Open jobs", align: "right", sortValue: (c) => c.openProjects, cell: (c) => <span className="tabular-nums font-medium">{c.openProjects}</span> },
  ], [])
  return (
    <PageContainer>
      <PageHeader title="Clients" description="Clients, their vendors, contacts and payment terms." actions={canCreate && <Button onClick={() => setOpen(true)}><Plus /> Add client</Button>} />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={!!search || country !== ALL} onReset={() => { setSearch(""); setCountry(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Name, email, city or contact" />
            <FilterSelect label="Country" value={country} onChange={setCountry} options={COUNTRIES} allLabel="All countries" />
          </FilterBar>
        </div>
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable rows={rows} columns={columns} getRowId={(c) => c.id} loading={isPending} onRowClick={(c) => navigate(`/clients/${c.id}`)} initialSort={{ id: "name", dir: "asc" }} caption="Clients"
            mobileCard={(c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.address.city}, {c.address.state} · {c.vendorCount} vendors · {c.openProjects} open jobs</p></div>}
            empty={<EmptyState icon={Building2} title="No clients found" description="Add a client to start creating inquiries." action={canCreate && <Button onClick={() => setOpen(true)}><Plus /> Add client</Button>} />}
          />
        )}
      </Card>
      <ClientFormDrawer open={open} onOpenChange={setOpen} saving={save.isPending} onSubmit={(v) => save.mutate({ input: v }, { onSuccess: (c) => { setOpen(false); navigate(`/clients/${c.id}`) } })} />
    </PageContainer>
  )
}
