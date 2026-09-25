import { memo, useCallback, useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { cn } from "@/lib/utils"

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number | null
  className?: string
  /** hide on narrow screens — keeps key columns visible on tablet */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl"
  align?: "left" | "right"
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  getRowId: (row: T) => string
  loading?: boolean
  onRowClick?: (row: T) => void
  selectable?: boolean
  selected?: ReadonlySet<string>
  onSelectedChange?: (ids: Set<string>) => void
  isRowSelectable?: (row: T) => boolean
  pageSize?: number
  empty?: ReactNode
  /** Card renderer used below the md breakpoint instead of the table */
  mobileCard?: (row: T) => ReactNode
  initialSort?: { id: string; dir: "asc" | "desc" }
  caption?: string
}

const HIDE: Record<NonNullable<Column<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
}

interface RowProps<T> {
  row: T
  id: string
  columns: Column<T>[]
  selectable: boolean
  canSelect: boolean
  isSelected: boolean
  onToggle: (id: string) => void
  onRowClick?: (row: T) => void
}

function RowInner<T>({ row, id, columns, selectable, canSelect, isSelected, onToggle, onRowClick }: RowProps<T>) {
  return (
    <TableRow
      data-state={isSelected ? "selected" : undefined}
      className={cn(onRowClick && "cursor-pointer", "data-[state=selected]:bg-primary-soft/60")}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      onKeyDown={onRowClick ? (e) => { if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row) } : undefined}
      tabIndex={onRowClick ? 0 : undefined}
    >
      {selectable && (
        <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} disabled={!canSelect} onCheckedChange={() => onToggle(id)} aria-label="Select row" />
        </TableCell>
      )}
      {columns.map((c) => (
        <TableCell key={c.id} className={cn("py-3", c.hideBelow && HIDE[c.hideBelow], c.align === "right" && "text-right", c.className)}>
          {c.cell(row)}
        </TableCell>
      ))}
    </TableRow>
  )
}
const Row = memo(RowInner) as typeof RowInner

export function DataTable<T>({
  rows, columns, getRowId, loading, onRowClick, selectable = false, selected, onSelectedChange, isRowSelectable,
  pageSize: initialPageSize = 10, empty, mobileCard, initialSort, caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort ?? null)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  // Page resets to the first page whenever the row count changes (new filter/search) — derived, no effect.
  const [pageState, setPageState] = useState({ page: 0, key: rows.length })
  const page = pageState.key === rows.length ? pageState.page : 0
  const setPage = (p: number) => setPageState({ page: p, key: rows.length })

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sortValue) return rows
    const get = col.sortValue
    return [...rows].sort((a, b) => {
      const av = get(a) ?? ""
      const bv = get(b) ?? ""
      const r = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === "asc" ? r : -r
    })
  }, [rows, columns, sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = useMemo(() => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize), [sorted, safePage, pageSize])

  const selectedSet = selected ?? EMPTY
  const toggle = useCallback(
    (id: string) => {
      if (!onSelectedChange) return
      const next = new Set(selectedSet)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      onSelectedChange(next)
    },
    [selectedSet, onSelectedChange],
  )
  const selectablePageIds = pageRows.filter((r) => !isRowSelectable || isRowSelectable(r)).map(getRowId)
  const allOnPage = selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedSet.has(id))
  const toggleAll = () => {
    if (!onSelectedChange) return
    const next = new Set(selectedSet)
    selectablePageIds.forEach((id) => (allOnPage ? next.delete(id) : next.add(id)))
    onSelectedChange(next)
  }

  const onSort = (c: Column<T>) => {
    if (!c.sortValue) return
    setSort((s) => (s?.id === c.id ? (s.dir === "asc" ? { id: c.id, dir: "desc" } : null) : { id: c.id, dir: "asc" }))
  }

  if (loading) return <TableSkeleton columns={Math.min(columns.length, 5)} />
  if (!rows.length) return <>{empty}</>

  return (
    <div>
      {mobileCard && (
        <ul className="divide-y md:hidden">
          {pageRows.map((r) => (
            <li key={getRowId(r)}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(r)} className="block w-full px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                  {mobileCard(r)}
                </button>
              ) : (
                <div className="px-4 py-3">{mobileCard(r)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={cn(mobileCard && "hidden md:block")}>
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox checked={allOnPage} onCheckedChange={toggleAll} aria-label="Select all rows on this page" disabled={!selectablePageIds.length} />
                </TableHead>
              )}
              {columns.map((c) => {
                const active = sort?.id === c.id
                const SortIcon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
                return (
                  <TableHead
                    key={c.id}
                    className={cn("h-10 text-xs font-semibold tracking-wide text-muted-foreground uppercase", c.hideBelow && HIDE[c.hideBelow], c.align === "right" && "text-right", c.className)}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.sortValue ? (
                      <button type="button" onClick={() => onSort(c)} className={cn("inline-flex items-center gap-1 rounded uppercase hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", active && "text-foreground")}>
                        {c.header}
                        <SortIcon className="size-3.5" aria-hidden />
                      </button>
                    ) : (
                      c.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => {
              const id = getRowId(r)
              return (
                <Row
                  key={id}
                  id={id}
                  row={r}
                  columns={columns}
                  selectable={selectable}
                  canSelect={!isRowSelectable || isRowSelectable(r)}
                  isSelected={selectedSet.has(id)}
                  onToggle={toggle}
                  onRowClick={onRowClick}
                />
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Pagination
        page={safePage}
        pageCount={pageCount}
        pageSize={pageSize}
        total={sorted.length}
        onPage={setPage}
        onPageSize={(n) => { setPageSizeState(n); setPageState({ page: 0, key: rows.length }) }}
      />
    </div>
  )
}

const EMPTY: ReadonlySet<string> = new Set()

const PAGE_SIZES = [5, 10, 20, 50]

/** Pagination footer: range, rows per page, numbered pages (with gaps), previous / next. Always visible. */
function Pagination({ page, pageCount, pageSize, total, onPage, onPageSize }: { page: number; pageCount: number; pageSize: number; total: number; onPage: (p: number) => void; onPageSize: (n: number) => void }) {
  const pages: (number | "gap")[] = []
  for (let i = 0; i < pageCount; i++) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 1) pages.push(i)
    else if (pages[pages.length - 1] !== "gap") pages.push("gap")
  }
  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Showing <span className="font-medium text-foreground tabular-nums">{page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)}</span> of <span className="font-medium text-foreground tabular-nums">{total}</span>
        </span>
        <label className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-8 rounded-md border bg-card px-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        {pages.map((p, i) =>
          p === "gap" ? (
            <span key={`g${i}`} className="px-1" aria-hidden>…</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="icon"
              className={cn("size-8 tabular-nums", p !== page && "text-foreground")}
              onClick={() => onPage(p)}
              aria-label={`Page ${p + 1}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p + 1}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" className="size-8" onClick={() => onPage(page + 1)} disabled={page >= pageCount - 1} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  )
}
