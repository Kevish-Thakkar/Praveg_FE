import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Sizes an element so it ends at the bottom of the viewport (minus `gap`) on large screens,
 * letting its panes scroll internally instead of the whole page. Height is undefined below `minWidth`.
 * Returns a callback ref, so it also works when the element mounts after loading.
 */
export function useFillHeight<T extends HTMLElement>(gap = 28, minWidth = 1024) {
  const node = useRef<T | null>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const measure = useCallback(() => {
    const el = node.current
    if (!el || window.innerWidth < minWidth) return setHeight(undefined)
    const top = el.getBoundingClientRect().top + window.scrollY
    setHeight(Math.max(360, Math.floor(window.innerHeight - top - gap)))
  }, [gap, minWidth])
  const ref = useCallback((el: T | null) => { node.current = el; measure() }, [measure])
  useEffect(() => {
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [measure])
  return [ref, height] as const
}
