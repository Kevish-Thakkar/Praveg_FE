import { FileBlank, FileCsv, FileDoc, FileImage, FilePdf, FilePpt, FileTxt, FileXls, FileZip, type AppIcon } from "@/components/icons"
import { fileKind, type FileKind } from "@/lib/file-type"
import { cn } from "@/lib/utils"

const KIND: Record<FileKind, { icon: AppIcon; cls: string }> = {
  PDF: { icon: FilePdf, cls: "text-red-600" },
  Word: { icon: FileDoc, cls: "text-blue-600" },
  Excel: { icon: FileXls, cls: "text-emerald-600" },
  CSV: { icon: FileCsv, cls: "text-emerald-600" },
  PowerPoint: { icon: FilePpt, cls: "text-orange-600" },
  Image: { icon: FileImage, cls: "text-violet-600" },
  ZIP: { icon: FileZip, cls: "text-amber-600" },
  Text: { icon: FileTxt, cls: "text-slate-500" },
  Other: { icon: FileBlank, cls: "text-slate-500" },
}

/** Icon for a file by its extension, coloured like Office / Drive (PDF red, Word blue, Excel green…). */
export function FileTypeIcon({ name, className }: { name: string; className?: string }) {
  const kind = fileKind(name)
  const { icon: Icon, cls } = KIND[kind]
  return <Icon className={cn("size-4 shrink-0", cls, className)} aria-label={`${kind} file`} />
}
