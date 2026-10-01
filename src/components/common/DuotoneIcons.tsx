import type { ReactNode } from "react"
import { IconContext } from "@phosphor-icons/react"

const DUOTONE = { weight: "duotone" } as const

/** Renders every app icon inside it in the duotone weight instead of the default single-tone one. */
export function DuotoneIcons({ children }: { children: ReactNode }) {
  return <IconContext.Provider value={DUOTONE}>{children}</IconContext.Provider>
}
