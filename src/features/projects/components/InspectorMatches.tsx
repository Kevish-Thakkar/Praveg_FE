import { useState } from "react"
import { CheckCircle2, CircleAlert, Globe2, MapPin, SearchX } from "@/components/icons"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SearchInput } from "@/components/common/SearchInput"
import { EmptyState } from "@/components/common/EmptyState"
import { UserAvatar } from "@/components/common/UserAvatar"
import { Money } from "@/components/common/Money"
import { cn } from "@/lib/utils"
import type { Address } from "@/types/domain"
import { useInspectorMatches } from "../hooks"

interface Props {
  site: Address | null
  skills: string[]
  projectId?: string
  selected: Set<string>
  onSelectedChange: (s: Set<string>) => void
  radiusKm?: number
}

/**
 * Nearby inspectors for a job site: skill match first, then distance. "Search outside this area"
 * widens the search to every active inspector with a matching skill.
 */
export function InspectorMatches({ site, skills, projectId, selected, onSelectedChange, radiusKm = 100 }: Props) {
  const [outside, setOutside] = useState(false)
  const [query, setQuery] = useState("")
  const q = useInspectorMatches({ site, skills, projectId, includeOutside: outside, query })
  const toggle = (id: string) => {
    const n = new Set(selected)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    onSelectedChange(n)
  }
  const ready = !!site?.city

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput value={query} onChange={setQuery} placeholder="Filter by name, city or skill" className="sm:max-w-xs" />
        <div className="flex items-center gap-2">
          <Switch id="outside" checked={outside} onCheckedChange={setOutside} />
          <Label htmlFor="outside" className="flex items-center gap-1 text-sm font-normal"><Globe2 className="size-4 text-muted-foreground" aria-hidden /> Search outside this area</Label>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {ready ? (outside ? `All active inspectors${skills.length ? " with a matching skill" : ""}, nearest first.` : `Within ${radiusKm} km of ${site!.city}${skills.length ? `, matching ${skills.join(", ")}` : ""}.`) : "Enter the site city to find nearby inspectors."}
      </p>

      {!ready ? null : q.isPending ? (
        <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : !q.data?.length ? (
        <EmptyState compact icon={SearchX} title="No inspectors found" description={outside ? "No active inspector has these skills. Add one in Inspectors." : "Nobody nearby matches — turn on “Search outside this area”."} />
      ) : (
        <ul className="max-h-[28rem] divide-y overflow-y-auto rounded-xl border">
          {q.data.map((m) => {
            const id = m.inspector.id
            const disabled = m.alreadyRequested
            const checked = selected.has(id) || disabled
            return (
              <li key={id}>
                <label className={cn("flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/50", checked && !disabled && "bg-primary-soft/50", disabled && "cursor-default opacity-60")}>
                  <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => toggle(id)} className="mt-1" aria-label={`Select ${m.inspector.name}`} />
                  <UserAvatar name={m.inspector.name} className="size-9" />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold">{m.inspector.name}</span>
                      <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium", m.nearby ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                        <MapPin className="size-3" aria-hidden /> {m.distanceKm} km · {m.inspector.address.city}
                      </span>
                      {disabled && <span className="text-[11px] font-medium text-muted-foreground">Already requested</span>}
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {m.inspector.skills.map((s) => (
                        <span key={s} className={cn("rounded px-1.5 py-0.5 text-[11px]", m.skillMatch.includes(s) ? "bg-primary-soft font-medium text-primary-text" : "bg-muted text-muted-foreground")}>{s}</span>
                      ))}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                      <span><Money amount={m.inspector.manDayRate} currency={m.inspector.currency} /> / day</span>
                      <span>{m.inspector.engagementType}</span>
                      {m.hasCv ? <span className="inline-flex items-center gap-0.5 text-success"><CheckCircle2 className="size-3" /> CV</span> : <span className="inline-flex items-center gap-0.5 text-warning"><CircleAlert className="size-3" /> No CV</span>}
                      {m.inspector.status !== "Available" && <span className="text-warning">{m.inspector.status}</span>}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
