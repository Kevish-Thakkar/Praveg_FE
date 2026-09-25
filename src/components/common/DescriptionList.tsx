import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface DescriptionItem {
  label: string
  value: ReactNode
  span?: 1 | 2
}

export function DescriptionList({ items, columns = 2, className }: { items: DescriptionItem[]; columns?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((it) => (
        <div key={it.label} className={cn("min-w-0 space-y-1", it.span === 2 && "sm:col-span-2")}>
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{it.label}</dt>
          <dd className="text-sm break-words text-foreground">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
