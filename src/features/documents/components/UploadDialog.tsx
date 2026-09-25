import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FileDropzone } from "@/components/forms/FileDropzone"
import type { DocumentAccess, DocumentCategory, DocumentEntity } from "@/types/domain"
import { useUploadDocuments } from "../hooks"

interface UploadDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  entityType: DocumentEntity
  entityId: string
  categories: DocumentCategory[]
  defaultCategory?: DocumentCategory
  title?: string
}

export function UploadDialog({ open, onOpenChange, entityType, entityId, categories, defaultCategory, title = "Upload documents" }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory ?? categories[0]!)
  const [access, setAccess] = useState<DocumentAccess>(entityType === "Inspector" ? "Restricted" : "Internal")
  const upload = useUploadDocuments()

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) setFiles([])
  }

  return (
    <FormDialog open={open} onOpenChange={close} title={title} description="Files are stored in the secure document bucket. Access follows each user's role." formId="upload-form" submitLabel={files.length ? `Upload ${files.length} file${files.length === 1 ? "" : "s"}` : "Upload"} loading={upload.isPending} submitDisabled={!files.length}>
      <form
        id="upload-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          upload.mutate(
            { files: files.map((f) => ({ name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), mimeType: f.type || "application/octet-stream" })), category, access, entityType, entityId },
            { onSuccess: () => close(false) },
          )
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={categories.length === 1}>
              <SelectTrigger id="doc-category" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-access">Access</Label>
            <Select value={access} onValueChange={(v) => setAccess(v as DocumentAccess)}>
              <SelectTrigger id="doc-access" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Internal">Internal — all authorised roles</SelectItem>
                <SelectItem value="Restricted">Restricted — Super Admin & coordinators</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <FileDropzone files={files} onChange={setFiles} />
      </form>
    </FormDialog>
  )
}
