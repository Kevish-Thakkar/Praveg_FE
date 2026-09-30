import type { Column } from "@/components/tables/DataTable"

/** CSV of the given rows using each column's exportValue (or sortValue). */
export function exportCsv<T>(filename: string, rows: T[], columns: Column<T>[]) {
  const cols = columns.filter((c) => c.header && (c.exportValue || c.sortValue))
  const esc = (v: unknown) => {
    const t = v === null || v === undefined ? "" : String(v)
    return /[",\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
  }
  const lines = [cols.map((c) => esc(c.header)).join(","), ...rows.map((r) => cols.map((c) => esc((c.exportValue ?? c.sortValue)!(r))).join(","))]
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
