import { db, newId } from "@/mock/db"
import { currentUserId } from "@/store/session.store"
import type { ActivityEntity, ActivityEvent } from "@/types/domain"
import { request } from "./api"

/** Internal helper — call inside a mutating handler. */
export function logActivity(entityType: ActivityEntity, entityId: string, projectId: string | null, message: string): void {
  db.activity.unshift({ id: newId("act"), entityType, entityId, projectId, message, actorId: currentUserId(), at: new Date().toISOString() })
}

export interface ActivityRow extends ActivityEvent {
  actorName: string
}

export const activityService = {
  list(filter: { projectId?: string; limit?: number } = {}) {
    return request<ActivityRow[]>(() =>
      db.activity
        .filter((a) => !filter.projectId || a.projectId === filter.projectId)
        .slice(0, filter.limit ?? 50)
        .map((a) => ({ ...a, actorName: db.users.find((u) => u.id === a.actorId)?.name ?? "System" })),
    )
  },
}
