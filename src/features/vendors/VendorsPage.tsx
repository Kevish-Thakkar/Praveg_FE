import { useMemo, useState } from "react"
import { MapPin, Pencil, Plus, Trash2, Truck } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar } from "@/components/tables/ListToolbar"
import { useHiddenColumns, useUrlSearch } from "@/hooks/use-list-state"
import { exportCsv } from "@/lib/csv"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { ActionMenu } from "@/components/common/ActionMenu"
import { usePermission } from "@/components/common/Can"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { ErrorState } from "@/components/feedback/ErrorState"
import { VendorFormDrawer } from "@/features/clients/components/ClientFormDrawer"
import type { VendorRow } from "@/services"
import { useDeleteVendor, useSaveVendor, useVendors } from "./hooks"

export function VendorsPage() {
  const { data = [], isPending, isError, error, refetch } = useVendors()
  const save = useSaveVendor()
  const del = useDeleteVendor()
  const canCreate = usePermission("vendors", "create")
  const canEdit = usePermission("vendors", "edit")
  const canDelete = usePermission("vendors", "delete")
  const [search, setSearch] = useUrlSearch()
  const [hidden, setHidden] = useHiddenColumns("vendors")
  const [editing, setEditing] = useState<VendorRow | "new" | null>(null)
  const [toDelete, setToDelete] = useState<VendorRow | null>(null)
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return data.filter((v) => !s || `${v.name} ${v.email} ${v.address.city} ${v.clientNames.join(" ")}`.toLowerCase().includes(s))
  }, [data, search])
  const columns = useMemo<Column<VendorRow>[]>(() => [
    { id: "name", header: "Vendor", sortValue: (v) => v.name, cell: (v) => <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.email}</p></div> },
    { id: "phone", header: "Mobile", hideBelow: "lg", cell: (v) => v.mobile || "—" },
    { id: "loc", header: "Location", hideBelow: "md", sortValue: (v) => v.address.city, cell: (v) => <span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-muted-foreground" aria-hidden />{v.address.city}, {v.address.state}</span> },
    { id: "jobs", header: "Projects", align: "right", sortValue: (v) => v.projectCount, cell: (v) => <span className="tabular-nums" title={v.clientNames.length ? `For ${v.clientNames.join(", ")}` : undefined}>{v.projectCount}</span> },
    { id: "a", header: "", className: "w-12", cell: (v) => <ActionMenu items={[{ label: "Edit vendor", icon: Pencil, hidden: !canEdit, onSelect: () => setEditing(v) }, { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, separatorBefore: true, onSelect: () => setToDelete(v) }]} /> },
  ], [canEdit, canDelete])

  return (
    <PageContainer>
      <PageHeader title="Vendors" description="Suppliers and manufacturers where inspections take place. Vendors are independent of clients; select one or more vendors on each project." actions={canCreate && <Button onClick={() => setEditing("new")}><Plus /> Add vendor</Button>} />
      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search name, email or city" }}
          columns={{ all: columns, hidden, onChange: setHidden }}
          onExport={() => exportCsv("vendors", rows, columns)}
        />
        {isError ? <ErrorState message={error.message} onRetry={() => void refetch()} /> : (
          <DataTable fill rows={rows} columns={columns} hiddenColumns={hidden} getRowId={(v) => v.id} loading={isPending} onRowClick={canEdit ? (v) => setEditing(v) : undefined} initialSort={{ id: "name", dir: "asc" }} caption="Vendors"
            mobileCard={(v) => <div><p className="font-medium">{v.name}</p><p className="text-xs text-muted-foreground">{v.address.city}, {v.address.state} · {v.projectCount} project(s)</p></div>}
            empty={<EmptyState icon={Truck} title="No vendors found" description="Add the suppliers and manufacturers you inspect at." action={canCreate && <Button onClick={() => setEditing("new")}><Plus /> Add vendor</Button>} />}
          />
        )}
      </Card>
      <VendorFormDrawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)} initial={editing === "new" ? null : editing} saving={save.isPending}
        onSubmit={(input) => save.mutate({ id: editing !== "new" && editing ? editing.id : undefined, input }, { onSuccess: () => setEditing(null) })} />
      <ConfirmDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Delete ${toDelete?.name}?`} description="Vendors linked to projects cannot be deleted." confirmLabel="Delete vendor" destructive loading={del.isPending} onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })} />
    </PageContainer>
  )
}
