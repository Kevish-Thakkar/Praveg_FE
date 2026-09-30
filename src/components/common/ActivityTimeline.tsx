import { memo } from "react"
import { isToday, isYesterday, parseISO } from "date-fns"
import { History } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export interface TimelineEvent { id: string; at: string; message: string; actorName?: string; meta?: string }

const dayLabel = (iso: string) => {
  const d = parseISO(iso)
  return isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : formatDate(iso, "EEE, dd MMM yyyy")
}

/** Events grouped by day, newest first, time on the left — used in checkpoint overlays and the Activity tab. */
export const ActivityTimeline = memo(function ActivityTimeline({ events, empty, className }: { events: TimelineEvent[]; empty?: string; className?: string }) {
  if (!events.length) return <EmptyState compact icon={History} title={empty ?? "No activity yet"} />
  const groups: { day: string; items: TimelineEvent[] }[] = []
  for (const e of [...events].sort((a, b) => b.at.localeCompare(a.at))) {
    const day = dayLabel(e.at)
    const g = groups.at(-1)
    if (g?.day === day) g.items.push(e)
    else groups.push({ day, items: [e] })
  }
  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((g) => (
        <section key={g.day} aria-label={g.day}>
          <h4 className="mb-2 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">{g.day}</h4>
          <ol className="relative space-y-3 border-l-2 border-border pl-5">
            {g.items.map((e) => (
              <li key={e.id} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[27px] size-3 rounded-full border-2 border-card bg-primary-strong ring-2 ring-primary-light" />
                <p className="text-sm text-foreground">{e.message}</p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={e.at}>{formatDate(e.at, "HH:mm")}</time>
                  {e.actorName && <> · {e.actorName}</>}
                  {e.meta && <> · {e.meta}</>}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
})
