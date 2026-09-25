import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { ROLES, type Role, type User } from "@/types/domain"

export type SessionUser = Pick<User, "id" | "name" | "email" | "role" | "organizationId">

interface SessionState {
  user: SessionUser | null
  signIn: (user: SessionUser) => void
  signOut: () => void
}

/** Global application state: only the authenticated session lives here. */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      signIn: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    {
      name: "praveg-ops-session",
      storage: createJSONStorage(() => localStorage),
      // A session saved by an older build with a role that no longer exists is dropped (back to login).
      merge: (persisted, current) => {
        const user = (persisted as Partial<SessionState> | undefined)?.user
        return { ...current, user: user && ROLES.includes(user.role) ? user : null }
      },
    },
  ),
)

export function currentUserId(): string {
  return useSessionStore.getState().user?.id ?? "usr_001"
}

export function useCurrentUser(): SessionUser {
  const user = useSessionStore((s) => s.user)
  if (!user) throw new Error("useCurrentUser used outside an authenticated route")
  return user
}

export function useRole(): Role {
  return useSessionStore((s) => s.user?.role ?? "Coordinator")
}
