import { memo } from "react"
import type { AppIcon } from "@/components/icons"
import { Link } from "react-router-dom"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Figure } from "@/services"
import type { Country } from "@/types/domain"
import { Flag } from "./Flag"
import { KPI_THEME, type KpiTheme } from "./KpiTile"

interface IncomeTileProps {
  label: string
  icon: AppIcon
  theme: KpiTheme
  inr: Figure
  aed: Figure
  /** the country picked in the page's country filter — its amount is shown large */
  country: Country
  /** noun for the count, singular, e.g. "invoice" */
  unit: string
  to?: string
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`

/**
 * Income KPI in the same style as the dashboard KPI (tinted gradient, faded background icon).
 * The selected country's amount is the headline; the other country is shown smaller underneath.
 * INR and AED are never added together.
 */
export const IncomeTile = memo(function IncomeTile({ label, icon: Icon, theme, inr, aed, country, unit, to }: IncomeTileProps) {
  const t = KPI_THEME[theme]
  const rows = [
    { country: "India" as Country, name: "India", cur: "INR", f: inr },
    { country: "United Arab Emirates" as Country, name: "UAE", cur: "AED", f: aed },
  ]
  const main = rows.find((r) => r.country === country)!
  const other = rows.find((r) => r.country !== country)!

  const body = (
    <>
      <Icon className={cn("pointer-events-none absolute -right-3 -bottom-3 size-20 opacity-[0.11]", t.art)} strokeWidth={1.3} aria-hidden />
      <div className="relative flex items-start justify-between gap-2">
        <span className="min-w-0 truncate pt-1 text-[13px] font-semibold text-foreground/85">{label}</span>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl border transition group-hover:bg-white", t.chip)}><Icon className="size-[18px]" aria-hidden /></span>
      </div>

      <div className="relative mt-1">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/60">
          <Flag country={main.country} />
          {main.name} · {plural(main.f.count, unit)}
        </p>
        <p className={cn("mt-1 truncate text-[22px] leading-tight font-bold tracking-tight tabular-nums", main.f.amount ? t.value : "text-foreground/40")} title={formatMoney(main.f.amount, main.cur)}>
          {formatMoney(main.f.amount, main.cur)}
        </p>
      </div>

      <div className="relative mt-2 flex items-center gap-1.5 border-t border-foreground/10 pt-2 text-xs text-foreground/60">
        <Flag country={other.country} className="opacity-80" />
        <span className="font-medium">{other.name}</span>
        <span className="min-w-0 flex-1 truncate text-right font-semibold text-foreground/75 tabular-nums" title={`${formatMoney(other.f.amount, other.cur)} · ${plural(other.f.count, unit)}`}>
          {formatMoney(other.f.amount, other.cur)}
        </span>
      </div>
    </>
  )
  const cls = cn("group relative block overflow-hidden rounded-xl px-3.5 py-3", t.bg)
  const aria = `${label}: ${main.name} ${formatMoney(main.f.amount, main.cur)}, ${other.name} ${formatMoney(other.f.amount, other.cur)}`
  return to ? (
    <Link to={to} aria-label={aria} className={cn(cls, "text-foreground transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}>{body}</Link>
  ) : (
    <div className={cls}>{body}</div>
  )
})
