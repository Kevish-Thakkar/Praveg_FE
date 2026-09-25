import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

/** Keeps the active tab in the URL (?tab=) so tabs are linkable and survive back/forward. */
export function useTabParam<T extends string>(allowed: readonly T[], fallback: T): [T, (t: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get("tab")
  const tab = (allowed as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback
  const setTab = useCallback(
    (t: string) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p)
          next.set("tab", t)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  return [tab, setTab]
}
