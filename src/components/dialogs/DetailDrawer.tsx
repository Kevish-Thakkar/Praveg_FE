import type { ReactNode } from "react"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface DetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  size?: "md" | "lg" | "xl"
  children: ReactNode
}

/** Side sheet for entity details and long forms; full-width on mobile. */
export function DetailDrawer({ open, onOpenChange, title, description, footer, size = "md", children }: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("flex w-full flex-col gap-0 bg-card p-0", size === "md" && "sm:max-w-lg", size === "lg" && "sm:max-w-2xl", size === "xl" && "sm:max-w-3xl")}>
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="pr-6">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}
