import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { MapPin, Pencil, Plus, Trash2, Truck } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar } from "@/components/tables/ListToolbar"
import { useHiddenColumns, useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { exportCsv } from "@/lib/csv"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { ActionMenu } from "@/components/common/ActionMenu"
import { usePermission } from "@/components/common/Can"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { ErrorState } from "@/components/feedback/ErrorState"
import { VendorFormDrawer } from "@/features/clients/components/ClientFormDrawer"
import { useLookupOptions } from "@/features/settings/lookups"
import type { VendorRow } from "@/services"
import { useDeleteVendor, useSaveVendor, useVendors } from "./hooks"

const KEYS = ["client"] as const

export function VendorsPage() {
  const { data = [], isPending, isError, error, refetch } = useVendors()
  const { clientOptions } = useLookupOptions()
  const save = useSaveVendor()
  const del = useDeleteVendor()
  const canCreate = usePermission("vendors", "create")
  const canEdit = usePermission("vendors", "edit")
  const canDelete = usePermission("vendors", "delete")
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const [hidden, setHidden] = useHiddenColumns("vendors")
  const client = f.values.client
  const [editing, setEditing] = useState<VendorRow | "new" | null>(null)
  const [toDelete, setToDelete] = useState<VendorRow | null>(null)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return data.filter((v) => (!client.length || client.includes(v.clientId)) && (!s || `${v.name} ${v.email} ${v.address.city} ${v.clientName}`.toLowerCase().includes(s)))
  }, [data, search, client])
  const columns = useMemo<Column<VendorRow>[]>(() => [
    { id: "name", header: "Vendor", sortValue: (v) => v.name, cell: (v) => <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.email}</p></div> },
    { id: "client", header: "Client", sortValue: (v) => v.clientName, cell: (v) => <Link to={`/clients/${v.clientId}`} onClick={(e) => e.stopPropagation()} className="text-primary-text hover:underline">{v.clientName}</Link> },
    { id: "loc", header: "Location", hideBelow: "md", sortValue: (v) => v.address.city, cell: (v) => <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted-foreground" aria-hidden />{v.address.city}, {v.address.state}</span> },
    { id: "jobs", header: "Jobs", align: "right", hideBelow: "lg", sortValue: (v) => v.projectCount, cell: (v) => <span className="tabular-nums">{v.projectCount}</span> },
    { id: "a", header: "", className: "w-12", cell: (v) => <ActionMenu items={[{ label: "Edit vendor", icon: Pencil, hidden: !canEdit, onSelect: () => setEditing(v) }, { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, separatorBefore: true, onSelect: () => setToDelete(v) }]} /> },
  ], [canEdit, canDelete])

  return (
    <PageContainer>
      <PageHeader title="Vendors" description="Each vendor belongs to a client — the supplier or manufacturer where the job takes place." actions={canCreate && <Button onClick={() => setEditing("new")}><Plus /> Add vendor</Button>} />
      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search name, email, city or client" }}
          filters={[{ id: "client", label: "Client", options: clientOptions.map((o) => ({ ...o, count: data.filter((v) => v.clientId === o.value).length })), value: client, onChange: (v) => f.set("client", v) }]}
          onClearFilters={f.clear}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("vendors", rows, columns)}
        />
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} hiddenColumns={hidden} getRowId={(v) => v.id} loading={isPending} onRowClick={canEdit ? (v) => setEditing(v) : undefined} initialSort={{ id: "name", dir: "asc" }} caption="Vendors"
            mobileCard={(v) => <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.clientName} · {v.address.city}, {v.address.state}</p></div>}
            empty={<EmptyState icon={Truck} title="No vendors found" description="Add the vendors of your clients." action={canCreate && <Button onClick={() => setEditing("new")}><Plus /> Add vendor</Button>} />}
          />
        )}
      </Card>
      <VendorFormDrawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing === "new" ? null : editing} saving={save.isPending}
        onSubmit={(input) => save.mutate({ id: editing !== "new" && editing ? editing.id : undefined, input }, { onSuccess: () => setEditing(null) })} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete ${toDelete?.name}?`} description="Vendors linked to projects cannot be deleted." confirmLabel="Delete vendor" destructive loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })} />
    </PageContainer>
  )
}
