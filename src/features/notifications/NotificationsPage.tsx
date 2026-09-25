import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ErrorState } from "@/components/feedback/ErrorState"
import { TableSkeleton } from "@/components/feedback/LoadingState"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/reminders/hooks"

/** §6.7 — email/notification information is also reflected inside the portal */
export function NotificationsPage() {
  const q = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const [view, setView] = useState("all")
  const list = (q.data ?? []).filter((n) => view === "all" || !n.read)
  const unread = (q.data ?? []).filter((n) => !n.read).length

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title="Notifications" description="Workflow updates, automatic emails, price requests and payment updates for your role." actions={<Button variant="outline" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}><CheckCheck /> Mark all read</Button>} />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread <span className="text-muted-foreground tabular-nums">{unread}</span></TabsTrigger></TabsList></Tabs>
        </div>
        {q.isPending ? <TableSkeleton rows={5} columns={2} /> : q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : list.length === 0 ? (
          <EmptyState icon={Bell} title={view === "unread" ? "No unread notifications" : "No notifications yet"} description="You're all caught up." />
        ) : (
          <ul className="divide-y">
            {list.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => { if (!n.read) markRead.mutate(n.id); if (n.link) navigate(n.link) }} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none", !n.read && "bg-primary-soft/40")}>
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-label={n.read ? undefined : "Unread"} />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{n.title}</span><StatusBadge status={n.kind} tone="neutral" dot={false} /></span>
                    <span className="block text-sm text-muted-foreground">{n.body}</span>
                    <span className="block text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageContainer>
  )
}
