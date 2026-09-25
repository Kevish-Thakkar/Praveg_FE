export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`
  }
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n)
}

export function formatFileSize(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Metadata the mock API stores for an uploaded file (content is not persisted in the prototype). */
export function toFileMeta(f: File): { name: string; sizeKb: number; mimeType: string } {
  return { name: f.name, sizeKb: Math.max(1, Math.round(f.size / 1024)), mimeType: f.type || "application/octet-stream" }
}

/** Short axis/label format: ₹1.2 Cr, ₹4.5 L, ₹39K (Indian units) · AED 6.5K, AED 1.2M */
export function formatMoneyCompact(amount: number, currency: string): string {
  if (amount === 0) return formatMoney(0, currency)
  const n = Math.abs(amount)
  const r = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1).replace(/\.0$/, ""))
  if (currency === "INR") {
    if (n >= 1e7) return `₹${r(amount / 1e7)} Cr`
    if (n >= 1e5) return `₹${r(amount / 1e5)} L`
    if (n >= 1e3) return `₹${r(amount / 1e3)}K`
    return `₹${Math.round(amount)}`
  }
  if (n >= 1e6) return `${currency} ${r(amount / 1e6)}M`
  if (n >= 1e3) return `${currency} ${r(amount / 1e3)}K`
  return `${currency} ${Math.round(amount)}`
}
