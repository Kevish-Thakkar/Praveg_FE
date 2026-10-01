import { Bell, CheckCheck } from "@/components/icons"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { EmptyState } from "@/components/common/EmptyState"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/features/reminders/hooks"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function NotificationsPopover() {
  const [open, setOpen] = useState(false)
  const { data = [] } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const navigate = useNavigate()
  const unread = data.filter((n) => !n.read).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-semibold text-white">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        {data.length === 0 ? (
          <EmptyState compact icon={Bell} title="You're all caught up" description="Reminders, inspector activity and email updates appear here." />
        ) : (
          <div className="h-[min(26rem,calc(100dvh-12rem))] overflow-y-auto overscroll-contain">
            <ul className="divide-y">
              {data.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none", !n.read && "bg-primary-soft/40")}
                    onClick={() => {
                      if (!n.read) markRead.mutate(n.id)
                      setOpen(false)
                      if (n.link) navigate(n.link)
                    }}
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-xs text-muted-foreground">{n.body}</span>
                      <span className="block text-xs text-muted-foreground">{n.kind} · {formatDateTime(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
