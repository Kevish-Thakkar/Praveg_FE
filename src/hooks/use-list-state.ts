import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Filter values kept in the URL (?stage=Inquiry,CVs%20Sent&client=cl_1) so a filtered list can be
 * linked to (dashboard KPIs do this), survives reload and works with the back button.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const values = useMemo(() => {
    const v = {} as Record<K, string[]>
    for (const k of keys) v[k] = (params.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean)
    return v
  }, [params, keys])

  const set = useCallback((key: K, next: string[]) => {
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      if (next.length) n.set(key, next.join(","))
      else n.delete(key)
      return n
    }, { replace: true })
  }, [setParams])

  const clear = useCallback(() => {
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      keys.forEach((k) => n.delete(k))
      return n
    }, { replace: true })
  }, [setParams, keys])

  const activeCount = keys.reduce((n, k) => n + (values[k].length ? 1 : 0), 0)
  return { values, set, clear, activeCount }
}

/** Search text kept in the URL (?q=) */
export function useUrlSearch(key = "q") {
  const [params, setParams] = useSearchParams()
  const value = params.get(key) ?? ""
  const set = useCallback((v: string) => {
    setParams((prev) => {
      const n = new URLSearchParams(prev)
      if (v) n.set(key, v)
      else n.delete(key)
      return n
    }, { replace: true })
  }, [setParams, key])
  return [value, set] as const
}

/** Columns hidden from a table, remembered per list in this browser (best effort). */
export function useHiddenColumns(storageKey: string, defaults: string[] = []) {
  const [hidden, setHiddenState] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(`praveg-cols:${storageKey}`)
      if (raw) return new Set(JSON.parse(raw) as string[])
    } catch {
      /* storage unavailable — fall back to defaults */
    }
    return new Set(defaults)
  })
  const setHidden = useCallback((next: Set<string>) => {
    setHiddenState(next)
    try {
      localStorage.setItem(`praveg-cols:${storageKey}`, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }, [storageKey])
  return [hidden, setHidden] as const
}
