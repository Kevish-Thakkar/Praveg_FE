import { memo, useMemo, useState } from "react"
import { Download, FileText, Lock, Trash2 } from "@/components/icons"
import { DataTable, type Column, type TableGroup } from "@/components/tables/DataTable"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { TextLink } from "@/components/common/TextLink"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatDateTime } from "@/lib/dates"
import { formatFileSize } from "@/lib/format"
import { fileKind } from "@/lib/file-type"
import { DOC_CATEGORY_CLS, docCategoryCls } from "@/lib/category-colors"
import { FileTypeIcon } from "@/components/common/FileTypeIcon"
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
  /** show the files in category sections, in this order (the Category column is dropped) */
  groupByCategory?: readonly string[]
}

const FileName = memo(function FileName({ d }: { d: DocumentRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <FileTypeIcon name={d.name} className="size-5" />
      <div className="min-w-0">
        <p className="truncate font-medium">{d.name}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(d.sizeKb)}</p>
      </div>
      {d.access === "Restricted" && <Lock className="size-3.5 shrink-0 text-warning" aria-label="Restricted" />}
    </div>
  )
})

export function DocumentsTable({ rows, loading, canDelete, showEntity, empty, selectable, selected, onSelectedChange, fill, groupByCategory }: DocumentsTableProps & { fill?: boolean }) {
  const download = useDownloadDocument()
  const del = useDeleteDocument()
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null)

  const columns = useMemo<Column<DocumentRow>[]>(
    () => [
      { id: "name", header: "Document", sortValue: (d) => d.name, cell: (d) => <FileName d={d} />, className: "max-w-[22rem]" },
      { id: "type", header: "Type", sortValue: (d) => fileKind(d.name), exportValue: (d) => fileKind(d.name), cell: (d) => <span className="text-sm whitespace-nowrap text-muted-foreground">{fileKind(d.name)}</span>, hideBelow: "md" },
      ...(groupByCategory ? [] : [{ id: "category", header: "Category", sortValue: (d: DocumentRow) => d.category, cell: (d: DocumentRow) => <StatusBadge status={d.category} className={DOC_CATEGORY_CLS[d.category]} dot={false} /> }]),
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
    [showEntity, canDelete, !!groupByCategory],
  )
  const group = useMemo<TableGroup<DocumentRow> | undefined>(() => groupByCategory && {
    key: (d) => d.category,
    order: groupByCategory,
    header: (c, n) => (
      <div className="flex items-center gap-2">
        <StatusBadge status={c} className={docCategoryCls(c)} dot={false} />
        <span className="text-xs text-muted-foreground tabular-nums">{n} file{n === 1 ? "" : "s"}</span>
      </div>
    ),
  }, [groupByCategory])

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
        group={group}
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
