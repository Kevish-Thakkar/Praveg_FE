import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar } from "@/components/tables/ListToolbar"
import { useHiddenColumns, useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { exportCsv } from "@/lib/csv"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { COUNTRIES } from "@/constants/geo"
import type { ClientRow } from "@/services"
import { useClients, useSaveClient } from "./hooks"
import { ClientFormDrawer } from "./components/ClientFormDrawer"

const KEYS = ["country"] as const

export function ClientsPage() {
  const navigate = useNavigate()
  const { data = [], isPending, isError, error, refetch } = useClients()
  const save = useSaveClient()
  const canCreate = usePermission("clients", "create")
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const [hidden, setHidden] = useHiddenColumns("clients")
  const country = f.values.country
  const [open, setOpen] = useState(false)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return data.filter((c) => (!country.length || country.includes(c.address.country)) && (!s || `${c.name} ${c.email} ${c.address.city} ${c.address.state} ${c.contacts.map((x) => x.name).join(" ")}`.toLowerCase().includes(s)))
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
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search name, email, city or contact" }}
          filters={[{ id: "country", label: "Country", options: COUNTRIES.map((x) => ({ value: x, label: x === "India" ? "India" : "UAE", count: data.filter((c) => c.address.country === x).length })), value: country, onChange: (v) => f.set("country", v) }]}
          onClearFilters={f.clear}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("clients", rows, columns)}
        />
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} hiddenColumns={hidden} getRowId={(c) => c.id} loading={isPending} onRowClick={(c) => navigate(`/clients/${c.id}`)} initialSort={{ id: "name", dir: "asc" }} caption="Clients"
            mobileCard={(c) => <div><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.address.city}, {c.address.state} · {c.vendorCount} vendors · {c.openProjects} open jobs</p></div>}
            empty={<EmptyState icon={Building2} title="No clients found" description="Add a client to start creating inquiries." action={canCreate && <Button onClick={() => setOpen(true)}><Plus /> Add client</Button>} />}
          />
        )}
      </Card>
      <ClientFormDrawer open={open} onOpenChange={setOpen} saving={save.isPending} onSubmit={(v) => save.mutate({ input: v }, { onSuccess: (c) => { setOpen(false); navigate(`/clients/${c.id}`) } })} />
    </PageContainer>
  )
}
