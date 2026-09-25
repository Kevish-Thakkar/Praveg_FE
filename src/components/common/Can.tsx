import type { ReactNode } from "react"
import { can, type Action, type Module } from "@/constants/permissions"
import { useRole } from "@/store/session.store"

/** Renders children only when the current role has the permission. */
export function Can({ module, action = "view", children, fallback = null }: { module: Module; action?: Action; children: ReactNode; fallback?: ReactNode }) {
  const role = useRole()
  return <>{can(role, module, action) ? children : fallback}</>
}

export function usePermission(module: Module, action: Action = "view"): boolean {
  const role = useRole()
  return can(role, module, action)
}
