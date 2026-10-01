import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { qk, useAppMutation } from "@/lib/query"
import { documentService, type UploadInput } from "@/services"
import type { DocumentCategory, DocumentEntity } from "@/types/domain"

export interface DocumentFilter {
  entityType?: DocumentEntity
  entityId?: string
  category?: DocumentCategory
}

export const useDocuments = (filter: DocumentFilter = {}, opts: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: [...qk.documents, filter], queryFn: () => documentService.list(filter), enabled: opts.enabled })

export const useUploadDocuments = () =>
  useAppMutation({
    mutationFn: (input: UploadInput) => documentService.upload(input),
    invalidate: [qk.documents, qk.inspectors, qk.projects, qk.activity],
    success: (docs) => `${docs.length} file${docs.length === 1 ? "" : "s"} uploaded`,
  })

export const useDeleteDocument = () =>
  useAppMutation({ mutationFn: (id: string) => documentService.remove(id), invalidate: [qk.documents, qk.inspectors, qk.projects], success: "Document deleted" })

export const useDownloadDocument = () =>
  useAppMutation({
    mutationFn: (id: string) => documentService.requestDownload(id),
    invalidate: [qk.activity],
    onSuccess: (r) => toast.success(`Secure link generated for ${r.name}`, { description: `Link expires in ${r.expiresInSeconds / 60} minutes (demo — no file is downloaded).` }),
  })
