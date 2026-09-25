import { memo } from "react"
import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  to?: string
  emphasis?: "default" | "attention"
}

export const StatCard = memo(function StatCard({ label, value, hint, icon: Icon, to, emphasis = "default" }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", emphasis === "attention" ? "bg-danger-soft text-danger" : "bg-primary-soft text-primary-text")}>
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="min-w-0 truncate text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </>
  )
  const cls = "block rounded-lg border bg-card p-4 sm:p-5 transition-colors"
  return to ? (
    <Link to={to} className={cn(cls, "text-foreground hover:border-primary/50 hover:bg-primary-soft/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
})
