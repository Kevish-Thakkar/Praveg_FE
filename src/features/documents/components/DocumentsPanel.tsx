import { useState } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SectionHeader } from "@/components/common/SectionHeader"
import { ErrorState } from "@/components/feedback/ErrorState"
import { EmptyState } from "@/components/common/EmptyState"
import { usePermission } from "@/components/common/Can"
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
}

/** Documents attached to one record (project, inspector, client) with upload. */
export function DocumentsPanel({ entityType, entityId, categories, title = "Documents", description, category, readOnly }: DocumentsPanelProps) {
  const [open, setOpen] = useState(false)
  const q = useDocuments({ entityType, entityId, category })
  const canUpload = usePermission("documents", "create") && !readOnly
  const canDelete = usePermission("documents", "delete") && !readOnly

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b p-4">
        <SectionHeader
          title={title}
          description={description}
          actions={canUpload && <Button size="sm" onClick={() => setOpen(true)}><Upload /> Upload</Button>}
        />
      </div>
      {q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
      ) : (
        <DocumentsTable
          rows={q.data ?? []}
          loading={q.isPending}
          canDelete={canDelete}
          empty={<EmptyState compact title="No documents yet" description={`Upload ${categories.slice(0, 3).join(", ").toLowerCase()} files for this record.`} action={canUpload && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Upload /> Upload files</Button>} />}
        />
      )}
      <UploadDialog open={open} onOpenChange={setOpen} entityType={entityType} entityId={entityId} categories={categories} />
    </Card>
  )
}
