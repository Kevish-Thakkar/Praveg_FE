import { useSearchParams } from "react-router-dom"
import { cn } from "@/lib/utils"
import type { Country } from "@/types/domain"
import { Flag } from "@/components/common/Flag"

const OPTIONS: { value: Country; key: "IN" | "AE"; label: string; currency: string }[] = [
  { value: "India", key: "IN", label: "India", currency: "INR" },
  { value: "United Arab Emirates", key: "AE", label: "UAE", currency: "AED" },
]

/** Common country filter for all graphs on a page. Kept in the URL (?country=IN|AE). */
export function useCountryFilter(): [Country, (c: Country) => void] {
  const [params, setParams] = useSearchParams()
  const current = OPTIONS.find((o) => o.key === params.get("country"))?.value ?? "India"
  const set = (c: Country) =>
    setParams((p) => { const n = new URLSearchParams(p); n.set("country", OPTIONS.find((o) => o.value === c)!.key); return n }, { replace: true })
  return [current, set]
}

export function CountryFilter({ value, onChange, className }: { value: Country; onChange: (c: Country) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Country" className={cn("inline-flex rounded-lg border bg-card p-0.5", className)}>
      {OPTIONS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "bg-gradient-to-r from-[#07a3e7] to-[#1e56c8] text-white" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Flag country={o.value} />
            {o.label}
            <span className={cn("rounded px-1 text-[10px] font-semibold", active ? "bg-white/20" : "bg-muted")}>{o.currency}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ChartsToolbar({ value, onChange, title = "Graphs" }: { value: Country; onChange: (c: Country) => void; title?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <CountryFilter value={value} onChange={onChange} />
      <span className="text-xs text-muted-foreground">Applies to all graphs below</span>
    </div>
  )
}
