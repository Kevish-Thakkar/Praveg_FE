import { StatusBadge } from "@/components/common/StatusBadge"
import { formatDate, todayISO } from "@/lib/dates"
import { cn } from "@/lib/utils"

/** Calendar-style date tile: month over day number, weekday below. Today is highlighted. */
export function VisitDateTile({ date, muted, className }: { date: string; muted?: boolean; className?: string }) {
  const today = date === todayISO()
  return (
    <span className={cn(
      "flex w-12 shrink-0 flex-col items-center overflow-hidden rounded-lg border bg-card text-center leading-none",
      muted && "opacity-60",
      className,
    )}>
      <span className={cn("w-full py-0.5 text-[10px] font-semibold tracking-wide uppercase", today ? "bg-primary-strong text-white" : "bg-primary-dark text-white")}>{formatDate(date, "MMM")}</span>
      <span className="pt-1 text-lg font-semibold tabular-nums">{formatDate(date, "d")}</span>
      <span className="pb-1 text-[10px] text-muted-foreground">{today ? "Today" : formatDate(date, "EEE")}</span>
    </span>
  )
}

export function VisitTypeBadge({ type }: { type: string }) {
  return <StatusBadge status={type} tone={type === "Repair" ? "warning" : type === "Follow-up" ? "violet" : "info"} dot={false} />
}
