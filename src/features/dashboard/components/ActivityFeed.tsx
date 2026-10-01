import { memo } from "react"
import { History } from "@/components/icons"
import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { UserAvatar } from "@/components/common/UserAvatar"
import { formatDateTime } from "@/lib/dates"
import type { ActivityRow } from "@/services"
import { useActivity } from "../hooks"

const Item = memo(function Item({ a }: { a: ActivityRow }) {
  return (
    <li className="flex gap-3 py-3">
      <UserAvatar name={a.actorName} className="size-7" />
      <div className="min-w-0 text-sm">
        <p className="text-foreground">{a.message}</p>
        <p className="text-xs text-muted-foreground">{a.actorName} · {a.entityType} · {formatDateTime(a.at)}</p>
      </div>
    </li>
  )
})

export function ActivityFeed({ projectId, limit = 8 }: { projectId?: string; limit?: number }) {
  const q = useActivity({ projectId, limit })
  if (q.isPending) return <div className="space-y-3 py-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
  if (!q.data.length) return <EmptyState compact icon={History} title="No activity yet" description="Changes to this record will be logged here." />
  return <ul className="divide-y">{q.data.map((a) => <Item key={a.id} a={a} />)}</ul>
}
