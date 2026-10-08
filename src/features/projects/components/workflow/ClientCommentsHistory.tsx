import { Link } from "react-router-dom"
import { ExternalLink, Mail, Pencil } from "@/components/icons"
import { StatusBadge } from "@/components/common/StatusBadge"
import { formatDate, formatDateTime } from "@/lib/dates"
import type { ProjectRow } from "@/services"

/** Every client comment on the report — change requests and the comment that completed the job. */
export function ClientCommentsHistory({ p }: { p: ProjectRow }) {
  const comments = p.clientComments
  return (
    <section className="space-y-3" aria-labelledby="cp-comments">
      <h3 id="cp-comments" className="text-sm font-semibold text-foreground">Client comments <span className="font-normal text-muted-foreground">· {comments.length}</span></h3>
      {comments.length ? (
        <ol className="space-y-2">
          {comments.map((x, i) => (
            <li key={`${x.recordedAt}-${i}`} className="space-y-2 rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={x.outcome} tone={x.outcome === "Job completed" ? "success" : "warning"} dot={false} />
                <span className="text-xs text-muted-foreground">on the {x.reportIssue === 1 ? "original report" : `revised report (revision ${x.reportIssue - 1})`}</span>
                <time className="ml-auto text-xs text-muted-foreground tabular-nums" dateTime={x.at}>{formatDate(x.at)}</time>
              </div>
              <p className="text-sm whitespace-pre-line text-foreground">{x.text}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                {x.source === "Email" ? <Mail className="size-3.5" aria-hidden /> : <Pencil className="size-3.5" aria-hidden />}
                {x.source === "Email" ? "By email" : "Recorded manually"} · by {x.recordedByName}, {formatDateTime(x.recordedAt)}
                {x.emailThreadId && (
                  <Link to={`/emails/${x.emailThreadId}`} className="inline-flex items-center gap-1 font-medium text-primary-text hover:underline">
                    Open email <ExternalLink className="size-3" aria-hidden />
                  </Link>
                )}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          {p.stage === "Completed" ? "This job was closed before client comments were recorded." : "No comments yet. They appear here once the client's comment on the report is recorded."}
        </p>
      )}
    </section>
  )
}
