import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { toFileMeta } from "@/lib/format"
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

const fileKey = (f: File) => `${f.name}-${f.size}`

export function UploadDialog({ open, onOpenChange, entityType, entityId, categories, defaultCategory, title = "Upload documents" }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory ?? categories[0]!)
  // each file keeps the category it was given; new files start with the default
  const [fileCategories, setFileCategories] = useState<Record<string, DocumentCategory>>({})
  const [access, setAccess] = useState<DocumentAccess>(entityType === "Inspector" ? "Restricted" : "Internal")
  const upload = useUploadDocuments()
  const perFile = categories.length > 1

  const close = (o: boolean) => {
    onOpenChange(o)
    if (!o) { setFiles([]); setFileCategories({}) }
  }
  const changeFiles = (next: File[]) => {
    setFiles(next)
    setFileCategories((cur) => Object.fromEntries(next.map((f) => [fileKey(f), cur[fileKey(f)] ?? category])))
  }
  const categoryOf = (f: File) => fileCategories[fileKey(f)] ?? category

  return (
    <FormDialog open={open} onOpenChange={close} title={title} description="Files are stored in the secure document bucket. Access follows each user's role." formId="upload-form" submitLabel={files.length ? `Upload ${files.length} file${files.length === 1 ? "" : "s"}` : "Upload"} loading={upload.isPending} submitDisabled={!files.length}>
      <form
        id="upload-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          upload.mutate(
            { files: files.map((f) => ({ ...toFileMeta(f), category: categoryOf(f) })), category, access, entityType, entityId },
            { onSuccess: () => close(false) },
          )
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doc-category">{perFile ? "Default category" : "Category"}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={!perFile}>
              <SelectTrigger id="doc-category" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            {perFile && <p className="text-xs text-muted-foreground">Applied to files you add next. Change any file's category below.</p>}
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
        <FileDropzone
          files={files}
          onChange={changeFiles}
          renderFileExtra={perFile ? (f) => (
            <Select value={categoryOf(f)} onValueChange={(v) => setFileCategories((cur) => ({ ...cur, [fileKey(f)]: v as DocumentCategory }))}>
              <SelectTrigger size="sm" className="w-44 shrink-0" aria-label={`Category for ${f.name}`}><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          ) : undefined}
        />
      </form>
    </FormDialog>
  )
}
