import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/feedback/LoadingState"
import { cn } from "@/lib/utils"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  formId: string
  submitLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  size?: "md" | "lg" | "xl"
  children: ReactNode
}

/** Dialog shell for short forms. The form inside must use id={formId}. */
export function FormDialog({ open, onOpenChange, title, description, formId, submitLabel = "Save", loading, submitDisabled, size = "md", children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className={cn("max-h-[92dvh] gap-0 overflow-hidden p-0", size === "md" && "sm:max-w-lg", size === "lg" && "sm:max-w-2xl", size === "xl" && "sm:max-w-4xl")}>
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="max-h-[calc(92dvh-10rem)] overflow-y-auto px-6 py-5">{children}</div>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={loading || submitDisabled}>
            {loading && <Spinner />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
