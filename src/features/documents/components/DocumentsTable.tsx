import { memo, useMemo, useState } from "react"
import { Download, FileText, Lock, Trash2 } from "lucide-react"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { TextLink } from "@/components/common/TextLink"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatDateTime } from "@/lib/dates"
import { formatFileSize } from "@/lib/format"
import type { DocumentRow } from "@/services"
import { useDeleteDocument, useDownloadDocument } from "../hooks"
import type { ReactNode } from "react"

interface DocumentsTableProps {
  rows: DocumentRow[]
  loading?: boolean
  canDelete?: boolean
  showEntity?: boolean
  empty?: ReactNode
  selectable?: boolean
  selected?: ReadonlySet<string>
  onSelectedChange?: (s: Set<string>) => void
}

const FileName = memo(function FileName({ d }: { d: DocumentRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="truncate font-medium">{d.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(d.sizeKb)}</p>
      </div>
      {d.access === "Restricted" && <Lock className="size-3.5 shrink-0 text-warning" aria-label="Restricted" />}
    </div>
  )
})

export function DocumentsTable({ rows, loading, canDelete, showEntity, empty, selectable, selected, onSelectedChange, fill }: DocumentsTableProps & { fill?: boolean }) {
  const download = useDownloadDocument()
  const del = useDeleteDocument()
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null)

  const columns = useMemo<Column<DocumentRow>[]>(
    () => [
      { id: "name", header: "Document", sortValue: (d) => d.name, cell: (d) => <FileName d={d} />, className: "max-w-[22rem]" },
      { id: "category", header: "Category", sortValue: (d) => d.category, cell: (d) => <StatusBadge status={d.category} tone="info" dot={false} /> },
      ...(showEntity
        ? [{ id: "entity", header: "Linked to", cell: (d: DocumentRow) => (d.entityLink ? <TextLink to={d.entityLink} className="line-clamp-1">{d.entityLabel}</TextLink> : <span className="text-muted-foreground">{d.entityLabel}</span>), hideBelow: "lg" as const, className: "max-w-[18rem]" }]
        : []),
      { id: "uploaded", header: "Uploaded", sortValue: (d) => d.uploadedAt, cell: (d) => <div className="text-sm"><p>{formatDateTime(d.uploadedAt)}</p><p className="text-xs text-muted-foreground">{d.uploadedByName}</p></div>, hideBelow: "md" },
      {
        id: "actions",
        header: "",
        className: "w-12",
        cell: (d) => (
          <ActionMenu
            label={`Actions for ${d.name}`}
            items={[
              { label: "Download", icon: Download, onSelect: () => download.mutate(d.id) },
              { label: "Delete", icon: Trash2, destructive: true, hidden: !canDelete, separatorBefore: true, onSelect: () => setToDelete(d) },
            ]}
          />
        ),
      },
    ],
    // mutate functions are stable in TanStack Query v5
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showEntity, canDelete],
  )

  return (
    <>
      <DataTable
        fill={fill}
        rows={rows}
        columns={columns}
        getRowId={(d) => d.id}
        loading={loading}
        selectable={selectable}
        selected={selected}
        onSelectedChange={onSelectedChange}
        initialSort={{ id: "uploaded", dir: "desc" }}
        caption="Documents"
        empty={empty ?? <EmptyState compact icon={FileText} title="No documents yet" description="Uploaded files will appear here." />}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete document?"
        description={<>“{toDelete?.name}” will be permanently removed from storage. Emails that already included it keep their record.</>}
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={() => toDelete && del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  )
}
