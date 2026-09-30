import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-7", className)}>{children}</div>
}
