import { memo } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CalendarClock, CheckCircle2, CircleAlert, CircleDot, Clock, Users } from "@/components/icons"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { formatDate, formatDateTime, relativeDay } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ActionItem, DashboardData, VisitRow } from "@/services"

const TONE: Record<ActionItem["tone"], { chip: string; icon: typeof CircleAlert }> = {
  danger: { chip: "bg-danger-soft text-danger", icon: CircleAlert },
  warning: { chip: "bg-warning-soft text-warning", icon: Clock },
  info: { chip: "bg-info-soft text-info", icon: CircleDot },
}

export const ActionItemsCard = memo(function ActionItemsCard({ items }: { items: ActionItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Next actions</CardTitle>
        <CardDescription>What each open job is waiting for, most urgent first.</CardDescription>
        <CardAction><Button asChild variant="ghost" size="sm"><Link to="/projects">All projects</Link></Button></CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {items.length === 0 ? (
          <EmptyState compact icon={CheckCircle2} title="Nothing pending" description="All open jobs are on track." />
        ) : (
          <ul className="divide-y">
            {items.map((a) => {
              const T = TONE[a.tone]
              return (
                <li key={a.id}>
                  <Link to={a.href} className="flex items-center gap-3 px-6 py-3 text-foreground hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none">
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", T.chip)}><T.icon className="size-4" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
                    </span>
                    <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">{a.owner}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
})

export const UpcomingCard = memo(function UpcomingCard({ jobs, interviews }: { jobs: VisitRow[]; interviews: DashboardData["interviews"] }) {
  const empty = jobs.length === 0 && interviews.length === 0
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Coming up</CardTitle>
        <CardDescription>Client interviews and scheduled job days</CardDescription>
        <CardAction><Button asChild variant="ghost" size="sm"><Link to="/calendar">Calendar</Link></Button></CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {empty ? (
          <EmptyState compact icon={CalendarClock} title="Nothing scheduled" description="Job dates and interviews will appear here." />
        ) : (
          <ul className="divide-y">
            {interviews.map((i) => (
              <li key={`int_${i.projectId}`}>
                <Link to={`/projects/${i.projectId}`} className="flex items-start gap-3 px-6 py-3 text-foreground hover:bg-muted/60">
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-soft text-violet"><Users className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Interview · {i.inspectorName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.code} · {i.title}</span>
                    <span className="block text-xs font-medium text-violet">{formatDateTime(i.at)}</span>
                  </span>
                </Link>
              </li>
            ))}
            {jobs.map((v) => (
              <li key={v.id}>
                <Link to={`/projects/${v.projectId}`} className="flex items-start gap-3 px-6 py-3 text-foreground hover:bg-muted/60">
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-soft leading-tight text-primary-text">
                    <span className="text-[10px] font-semibold uppercase">{formatDate(v.date, "MMM")}</span>
                    <span className="text-lg font-bold tabular-nums">{formatDate(v.date, "dd")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{v.projectTitle}</span>
                    <span className="block truncate text-xs text-muted-foreground">{v.projectCode} · {v.location}</span>
                    <span className="block text-xs text-muted-foreground">{v.inspectorName} · {relativeDay(v.date)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
})
