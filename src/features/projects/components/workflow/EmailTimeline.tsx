import { memo } from "react"
import { Clock, Mail, Paperclip, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import { useEmails } from "@/features/emails/hooks"

/** Every email for the project, including automatic ones still waiting to go out. */
export const EmailTimeline = memo(function EmailTimeline({ projectId, limit }: { projectId: string; limit?: number }) {
  const q = useEmails({ projectId })
  if (q.isPending) return <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12" />)}</div>
  const rows = (q.data ?? []).slice(0, limit)
  if (!rows.length) return <EmptyState compact icon={Mail} title="No emails yet" />
  return (
    <ol className="relative space-y-4 border-l pl-5">
      {rows.map((e) => {
        const scheduled = e.status === "Scheduled"
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute top-0.5 -left-[29px] flex size-6 items-center justify-center rounded-full border-2 border-card", scheduled ? "bg-violet-soft text-violet" : e.automatic ? "bg-info-soft text-info" : "bg-primary text-white")}>
              {scheduled ? <Clock className="size-3" /> : e.automatic ? <Zap className="size-3" /> : <Mail className="size-3" />}
            </span>
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{e.kind}{scheduled && <StatusBadge status="Scheduled" />}{e.automatic && !scheduled && <span className="text-[11px] font-normal text-muted-foreground">automatic</span>}</p>
            <p className="truncate text-xs text-muted-foreground">{e.subject}</p>
            <p className="truncate text-xs text-muted-foreground">To {e.to.join(", ")} · {scheduled ? "sends " : ""}{formatDateTime(e.sentAt)}</p>
            {e.attachmentNames.length > 0 && <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"><Paperclip className="size-3" /> {e.attachmentNames.join(", ")}</p>}
          </li>
        )
      })}
    </ol>
  )
})
