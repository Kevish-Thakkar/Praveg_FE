import { memo } from "react"
import type { AppIcon } from "@/components/icons"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export type KpiTheme = "sky" | "violet" | "amber" | "emerald" | "rose" | "royal"

export const KPI_THEME: Record<KpiTheme, { bg: string; chip: string; art: string; value: string }> = {
  sky: { bg: "kpi-sky", chip: "bg-white/70 text-[#0473a6] border-[#07a3e7]/30", art: "text-[#07a3e7]", value: "text-[#08476b]" },
  violet: { bg: "kpi-violet", chip: "bg-white/70 text-violet border-violet/30", art: "text-violet", value: "text-[#3b1a7a]" },
  amber: { bg: "kpi-amber", chip: "bg-white/70 text-warning border-[#f59e0b]/35", art: "text-[#f59e0b]", value: "text-[#7a3d06]" },
  emerald: { bg: "kpi-emerald", chip: "bg-white/70 text-success border-[#16a34a]/30", art: "text-[#16a34a]", value: "text-[#0f4d2a]" },
  rose: { bg: "kpi-rose", chip: "bg-white/70 text-danger border-[#e11d48]/30", art: "text-[#e11d48]", value: "text-[#7a1020]" },
  royal: { bg: "kpi-royal", chip: "bg-white/70 text-[#1e56c8] border-[#1e56c8]/30", art: "text-[#1e56c8]", value: "text-[#15286a]" },
}

interface KpiTileProps {
  label: string
  value: string | number
  hint?: string
  icon: AppIcon
  theme: KpiTheme
  to?: string
}

/**
 * Compact dashboard KPI: tinted gradient, count top-left, icon in a rounded box with a faint border
 * in the top-right corner, label and a one-line hint. A faded icon bottom-right is the only decoration.
 */
export const KpiTile = memo(function KpiTile({ label, value, hint, icon: Icon, theme, to }: KpiTileProps) {
  const t = KPI_THEME[theme]
  const body = (
    <>
      <Icon className={cn("pointer-events-none absolute -right-2 -bottom-3 size-16 opacity-[0.1]", t.art)} strokeWidth={1.3} aria-hidden />
      <div className="relative flex items-start justify-between gap-2">
        <span className={cn("pt-0.5 text-2xl leading-none font-bold tracking-tight tabular-nums", t.value)}>{value}</span>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border transition group-hover:bg-white", t.chip)}>
          <Icon className="size-[18px]" aria-hidden />
        </span>
      </div>
      <p className="relative mt-1.5 truncate text-[13px] font-semibold text-foreground/85">{label}</p>
      {hint && <p className="relative truncate text-[11px] text-foreground/60" title={hint}>{hint}</p>}
    </>
  )
  const cls = cn("group relative block overflow-hidden rounded-xl px-3.5 py-3", t.bg)
  return to ? (
    <Link to={to} className={cn(cls, "text-foreground transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
})
