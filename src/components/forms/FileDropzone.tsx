import { useId, useRef, useState, type DragEvent, type ReactNode } from "react"
import { FileUp, X } from "@/components/icons"
import { FileTypeIcon } from "@/components/common/FileTypeIcon"
import { formatFileSize } from "@/lib/format"
import { cn } from "@/lib/utils"

interface FileDropzoneProps {
  files: File[]
  onChange: (files: File[]) => void
  accept?: string
  hint?: string
  /** single-file mode replaces the current file */
  multiple?: boolean
  invalid?: boolean
  /** extra control shown on each selected file's row (e.g. its category) */
  renderFileExtra?: (file: File) => ReactNode
}

export function FileDropzone({ files, onChange, accept = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip", hint, multiple = true, invalid, renderFileExtra }: FileDropzoneProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const add = (list: FileList | null) => {
    if (!list) return
    if (!multiple) {
      if (list[0]) onChange([list[0]])
      return
    }
    const incoming = Array.from(list).filter((f) => !files.some((x) => x.name === f.name && x.size === f.size))
    onChange([...files, ...incoming])
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    add(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring",
          dragging ? "border-primary bg-primary-soft" : invalid ? "border-danger/60 bg-danger-soft/40" : "border-input bg-muted/50 hover:border-primary/60 hover:bg-primary-soft/40",
        )}
      >
        <FileUp className="size-6 text-primary-text" aria-hidden />
        <span className="text-sm font-medium">Drop files here or <span className="text-primary-text underline">browse</span></span>
        <span className="text-xs text-muted-foreground">{hint ?? `PDF, Word, Excel, images or ZIP · ${multiple ? "multiple files allowed" : "one file"}`}</span>
        <input ref={inputRef} id={inputId} type="file" multiple={multiple} accept={accept} className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = "" }} />
      </label>
      {files.length > 0 && (
        <ul className="divide-y rounded-lg border" aria-label="Selected files">
          {files.map((f) => {
            return (
              <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <FileTypeIcon name={f.name} className="size-5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(f.size / 1024)}</p>
                </div>
                {renderFileExtra?.(f)}
                <button type="button" onClick={() => onChange(files.filter((x) => x !== f))} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${f.name}`}>
                  <X className="size-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
