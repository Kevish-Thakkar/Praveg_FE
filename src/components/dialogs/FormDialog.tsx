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

/** Full-screen sheet below `sm`, centred dialog from `sm` up. Pair with the body and footer classes. */
export const DIALOG_MOBILE_FULLSCREEN = "flex h-dvh max-h-dvh w-full max-w-full flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[92dvh] sm:rounded-lg sm:border"
export const DIALOG_MOBILE_BODY = "min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
export const DIALOG_MOBILE_FOOTER = "flex-row justify-end border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 [&>button]:flex-1 sm:[&>button]:flex-none"

/** Dialog shell for short forms. The form inside must use id={formId}. */
export function FormDialog({ open, onOpenChange, title, description, formId, submitLabel = "Save", loading, submitDisabled, size = "md", children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className={cn(DIALOG_MOBILE_FULLSCREEN, size === "md" && "sm:max-w-lg", size === "lg" && "sm:max-w-2xl", size === "xl" && "sm:max-w-4xl")}>
        <DialogHeader className="border-b px-4 pt-5 pb-4 pr-12 text-left sm:px-6 sm:pt-6">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className={DIALOG_MOBILE_BODY}>{children}</div>
        <DialogFooter className={DIALOG_MOBILE_FOOTER}>
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
