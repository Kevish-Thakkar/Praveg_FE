import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useSearchIndex } from "@/features/dashboard/hooks"
import { NAV } from "@/constants/navigation"
import { can } from "@/constants/permissions"
import { useRole } from "@/store/session.store"
import type { SearchHit } from "@/services"

const GROUP_MODULE = { Projects: "projects", Inspectors: "inspectors", Clients: "clients", Vendors: "vendors" } as const

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const role = useRole()
  const { data, isPending } = useSearchIndex(open)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const groups = useMemo(() => {
    const out = new Map<SearchHit["group"], SearchHit[]>()
    for (const hit of data ?? []) {
      if (!can(role, GROUP_MODULE[hit.group])) continue
      out.set(hit.group, [...(out.get(hit.group) ?? []), hit])
    }
    return [...out.entries()]
  }, [data, role])

  const pages = NAV.flatMap((g) => g.items).filter((i) => can(role, i.module))

  const go = (href: string) => {
    setOpen(false)
    navigate(href)
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="h-9 w-9 justify-start gap-2 px-0 text-muted-foreground sm:w-56 sm:px-3 lg:w-64 xl:w-80" aria-label="Search (Ctrl+K)">
        <Search className="mx-auto sm:mx-0" />
        <span className="hidden sm:inline">Search projects, inspectors…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] xl:inline">Ctrl K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Search projects, inspectors, clients and vendors">
        <CommandInput placeholder="Type to search…" />
        <CommandList>
          <CommandEmpty>{isPending ? "Loading…" : "No results found."}</CommandEmpty>
          <CommandGroup heading="Go to">
            {pages.map((p) => (
              <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(p.to)}>
                <p.icon /> {p.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {groups.map(([group, hits]) => (
            <CommandGroup key={group} heading={group}>
              {hits.map((h) => (
                <CommandItem key={h.id} value={`${h.title} ${h.subtitle}`} onSelect={() => go(h.href)}>
                  <div className="min-w-0">
                    <p className="truncate">{h.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{h.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
