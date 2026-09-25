import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7", className)}>{children}</div>
}
