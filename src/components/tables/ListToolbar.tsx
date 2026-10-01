import { useState, type ReactNode } from "react"
import { ChevronDown, Columns3, Download, ListFilter, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchInput } from "@/components/common/SearchInput"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface FilterOption { value: string; label: string; count?: number }

export interface FilterDef {
  id: string
  label: string
  options: FilterOption[]
  value: string[]
  onChange: (v: string[]) => void
  /** single choice (radio-like); default is multi-select */
  single?: boolean
  /** show a search box above the options (long lists such as projects) */
  searchable?: boolean
  /** its own dropdown next to the search box instead of inside the Filter popover */
  inline?: boolean
}

interface ListToolbarProps {
  search?: { value: string; onChange: (v: string) => void; placeholder: string }
  filters?: FilterDef[]
  onClearFilters?: () => void
  columns?: { all: { id: string; header: string }[]; hidden: ReadonlySet<string>; onChange: (hidden: Set<string>) => void }
  onExport?: () => void
  /** extra controls placed before Filter (e.g. a view switch) */
  children?: ReactNode
  className?: string
}

/**
 * The one list toolbar used across the platform:
 *   Search…  [ Project ▾ ]          [ Filter ] [ Columns ] [ Export ]
 *   [Status: Active ×] [Client: Kaveri ×]  Clear all
 * Filters live in a popover (a bottom drawer on phones), never inline, so listing pages stay calm.
 */
export function ListToolbar({ search, filters = [], onClearFilters, columns, onExport, children, className }: ListToolbarProps) {
  const active = filters.filter((f) => f.value.length)
  const chips = active.flatMap((f) => f.value.map((v) => ({ f, v, label: f.options.find((o) => o.value === v)?.label ?? v })))
  const inline = filters.filter((f) => f.inline)
  const popover = filters.filter((f) => !f.inline)
  return (
    <div className={cn("space-y-3 border-b px-4 py-4 sm:px-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {(search || inline.length > 0) && (
          <div className="flex min-w-0 flex-col gap-2 sm:max-w-2xl sm:flex-1 sm:flex-row sm:items-center">
            {search && <SearchInput value={search.value} onChange={search.onChange} placeholder={search.placeholder} className="sm:w-auto sm:max-w-md sm:flex-1" />}
            {inline.map((f) => <InlineFilter key={f.id} f={f} />)}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {children}
          {popover.length > 0 && <FilterButton filters={popover} activeCount={popover.filter((f) => f.value.length).length} onClear={onClearFilters} />}
          {columns && <ColumnsMenu {...columns} />}
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download /> <span className="hidden sm:inline">Export</span><span className="sr-only sm:hidden">Export CSV</span>
            </Button>
          )}
        </div>
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.slice(0, VISIBLE_CHIPS).map((c) => <li key={`${c.f.id}:${c.v}`} className="min-w-0 max-w-full"><FilterChip {...c} /></li>)}
          {chips.length > VISIBLE_CHIPS && (
            <li>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex h-8 items-center rounded-md border border-primary-strong/25 bg-primary-light px-2.5 text-[13px] font-semibold text-primary-dark tabular-nums hover:bg-primary-strong/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label={`Show ${chips.length - VISIBLE_CHIPS} more filters`}>
                    +{chips.length - VISIBLE_CHIPS}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
                  <p className="border-b px-3 py-2 text-xs font-semibold tracking-[0.04em] text-primary-dark uppercase">More filters</p>
                  <ul className="max-h-[min(20rem,60dvh)] space-y-1.5 overflow-y-auto p-2">
                    {chips.slice(VISIBLE_CHIPS).map((c) => <li key={`${c.f.id}:${c.v}`}><FilterChip {...c} block /></li>)}
                  </ul>
                </PopoverContent>
              </Popover>
            </li>
          )}
          {onClearFilters && (
            <li><Button variant="ghost" size="sm" onClick={onClearFilters} className="text-muted-foreground">Clear all</Button></li>
          )}
        </ul>
      )}
    </div>
  )
}

const VISIBLE_CHIPS = 2

function FilterChip({ f, v, label, block }: { f: FilterDef; v: string; label: string; block?: boolean }) {
  return (
    <span className={cn("inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border border-primary-strong/25 bg-primary-light pr-1 pl-2.5 text-[13px] text-primary-dark", block ? "flex w-full" : "sm:max-w-80")} title={`${f.label}: ${label}`}>
      <span className="shrink-0 text-primary-dark/70">{f.label}:</span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      <button
        type="button"
        onClick={() => f.onChange(f.value.filter((x) => x !== v))}
        className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-primary-strong/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={`Remove filter ${f.label}: ${label}`}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  )
}

function FilterButton({ filters, activeCount, onClear }: { filters: FilterDef[]; activeCount: number; onClear?: () => void }) {
  const [open, setOpen] = useState(false)
  const mobile = useIsMobile()
  const trigger = (
    <Button variant="outline" aria-haspopup="dialog" aria-expanded={open} className={cn(activeCount > 0 && "border-primary-strong/50 bg-primary-light text-primary-dark")} onClick={mobile ? () => setOpen(true) : undefined}>
      <ListFilter /> Filter
      {activeCount > 0 && <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded bg-primary-dark px-1 text-[11px] font-semibold text-white tabular-nums">{activeCount}</span>}
    </Button>
  )
  const body = <FilterPanel filters={filters} />
  const footer = (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={() => onClear?.()} disabled={!activeCount}>Clear all</Button>
      <Button onClick={() => setOpen(false)}>Done</Button>
    </div>
  )
  if (mobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-2xl bg-card p-0">
            <SheetHeader className="border-b px-5 py-4"><SheetTitle>Filter</SheetTitle><SheetDescription>Narrow the list. Changes apply immediately.</SheetDescription></SheetHeader>
            <div className="overflow-y-auto px-5 py-4">{body}</div>
            <SheetFooter className="border-t px-5 py-3">{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    )
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="border-b px-4 py-3"><p className="text-sm font-semibold">Filter</p><p className="text-xs text-muted-foreground">Changes apply immediately.</p></div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">{body}</div>
        <div className="border-t px-4 py-3">{footer}</div>
      </PopoverContent>
    </Popover>
  )
}

function FilterPanel({ filters }: { filters: FilterDef[] }) {
  return (
    <div className="space-y-5">
      {filters.map((f) => <FilterGroup key={f.id} f={f} />)}
    </div>
  )
}

function InlineFilter({ f }: { f: FilterDef }) {
  const n = f.value.length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("justify-between sm:w-auto sm:shrink-0", n > 0 && "border-primary-strong/50 bg-primary-light text-primary-dark")} aria-label={`${f.label} filter${n ? `, ${n} selected` : ""}`}>
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{f.label}</span>
            {n > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded bg-primary-dark px-1 text-[11px] font-semibold text-white tabular-nums">{n}</span>}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto px-3 py-3">
          <FilterGroup f={f} hideLegend />
        </div>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="text-xs text-muted-foreground">{n ? `${n} selected` : `All ${f.label.toLowerCase()}s`}</span>
          <Button variant="ghost" size="sm" disabled={!n} onClick={() => f.onChange([])}>Clear</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterGroup({ f, hideLegend }: { f: FilterDef; hideLegend?: boolean }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const options = q ? f.options.filter((o) => o.label.toLowerCase().includes(q)) : f.options
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className={hideLegend ? "sr-only" : "mb-2 text-xs font-semibold tracking-[0.04em] text-primary-dark uppercase"}>{f.label}</legend>
      {f.searchable && f.options.length > 0 && <SearchInput value={query} onChange={setQuery} placeholder={`Search ${f.label.toLowerCase()}`} className="sm:w-full" />}
      {options.length === 0 ? <p className="text-sm text-muted-foreground">{q ? "No matches" : "No options"}</p> : (
        <ul className="space-y-0.5">
          {options.map((o) => {
            const checked = f.value.includes(o.value)
            return (
              <li key={o.value}>
                <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-muted">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => f.onChange(f.single ? (checked ? [] : [o.value]) : checked ? f.value.filter((x) => x !== o.value) : [...f.value, o.value])}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.count !== undefined && <span className="text-xs text-muted-foreground tabular-nums">{o.count}</span>}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}

function ColumnsMenu({ all, hidden, onChange }: { all: { id: string; header: string }[]; hidden: ReadonlySet<string>; onChange: (h: Set<string>) => void }) {
  const list = all.filter((c) => c.header)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="hidden md:inline-flex"><Columns3 /> Columns</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Show columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list.map((c, i) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={!hidden.has(c.id)}
            disabled={i === 0}
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(v) => { const n = new Set(hidden); if (v) n.delete(c.id); else n.add(c.id); onChange(n) }}
          >
            {c.header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
