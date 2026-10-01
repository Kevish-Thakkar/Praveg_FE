import { useMemo, useState } from "react"
import { FILE_KINDS, fileKind } from "@/lib/file-type"
import { Upload } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SectionHeader } from "@/components/common/SectionHeader"
import { ErrorState } from "@/components/feedback/ErrorState"
import { EmptyState } from "@/components/common/EmptyState"
import { usePermission } from "@/components/common/Can"
import { ListToolbar } from "@/components/tables/ListToolbar"
import type { DocumentCategory, DocumentEntity } from "@/types/domain"
import { useDocuments } from "../hooks"
import { DocumentsTable } from "./DocumentsTable"
import { UploadDialog } from "./UploadDialog"

interface DocumentsPanelProps {
  entityType: DocumentEntity
  entityId: string
  categories: DocumentCategory[]
  title?: string
  description?: string
  category?: DocumentCategory
  /** hide upload and delete (e.g. completed project viewed by a coordinator) */
  readOnly?: boolean
  /** search and category filter above the table */
  filterable?: boolean
}

/** Documents attached to one record (project, inspector, client) with upload. */
export function DocumentsPanel({ entityType, entityId, categories, title = "Documents", description, category, readOnly, filterable }: DocumentsPanelProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [catFilter, setCatFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const q = useDocuments({ entityType, entityId, category })
  const canUpload = usePermission("documents", "create") && !readOnly
  const canDelete = usePermission("documents", "delete") && !readOnly

  const all = useMemo(() => q.data ?? [], [q.data])
  const categoryOptions = useMemo(() => {
    const present = new Set<string>([...categories, ...all.map((d) => d.category)])
    return [...present].map((c) => ({ value: c, label: c, count: all.filter((d) => d.category === c).length }))
  }, [categories, all])
  const typeOptions = useMemo(() => {
    const count = new Map<string, number>()
    for (const d of all) { const k = fileKind(d.name); count.set(k, (count.get(k) ?? 0) + 1) }
    return FILE_KINDS.filter((k) => count.has(k)).map((k) => ({ value: k, label: k, count: count.get(k) }))
  }, [all])
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return all.filter((d) => (!catFilter.length || catFilter.includes(d.category)) && (!typeFilter.length || typeFilter.includes(fileKind(d.name))) && (!s || d.name.toLowerCase().includes(s)))
  }, [all, catFilter, typeFilter, search])
  const filtered = !!search || catFilter.length > 0 || typeFilter.length > 0

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b p-4">
        <SectionHeader
          title={title}
          description={description}
          actions={canUpload && <Button size="sm" onClick={() => setOpen(true)}><Upload /> Upload</Button>}
        />
      </div>
      {filterable && (
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search file name" }}
          filters={[
            { id: "category", label: "Category", options: categoryOptions, value: catFilter, onChange: setCatFilter },
            { id: "type", label: "Type", options: typeOptions, value: typeFilter, onChange: setTypeFilter },
          ]}
          onClearFilters={() => { setCatFilter([]); setTypeFilter([]) }}
        />
      )}
      {q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
      ) : (
        <DocumentsTable
          rows={rows}
          loading={q.isPending}
          canDelete={canDelete}
          empty={filtered
            ? <EmptyState compact title="No documents match" description="Try another category or clear the filters." />
            : <EmptyState compact title="No documents yet" description={`Upload ${categories.slice(0, 3).join(", ").toLowerCase()} files for this record.`} action={canUpload && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Upload /> Upload files</Button>} />}
        />
      )}
      <UploadDialog open={open} onOpenChange={setOpen} entityType={entityType} entityId={entityId} categories={categories} />
    </Card>
  )
}
