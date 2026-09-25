import { Link } from "react-router-dom"
import { ArrowRight, BadgeCheck } from "lucide-react"
import { Money } from "@/components/common/Money"
import { TONE_CLASSES } from "@/constants/status"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { BillingNextKey } from "@/lib/workflow"
import type { ProjectRow } from "@/services"

const OWNER_TEXT: Record<string, string> = { Accounts: "Accounts", Coordinator: "Waiting on coordinator", Client: "Waiting on client", "—": "" }

/**
 * Next accounts action for a project. On the Invoicing page `onAction` opens the dialog directly;
 * elsewhere (project board) it links to the Invoicing page, which opens the same dialog.
 */
export function BillingNextAction({ p, onAction, className }: { p: ProjectRow; onAction?: (key: BillingNextKey) => void; className?: string }) {
  const n = p.billingInsight.next
  const box = cn("flex w-52 max-w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs", className)
  if (n.key === "none") return <span className={cn(box, "border-dashed py-2.5 text-muted-foreground")}>{p.billingInsight.index === 4 ? "Closed — paid" : "No action needed"}</span>
  const actionable = n.owner === "Accounts" || n.key === "confirmPayment"
  const urgent = n.key === "followUp"
  const inner = (
    <>
      <span className="min-w-0">
        <span className={cn("block truncate font-semibold", urgent ? "text-danger" : "text-foreground")}>{n.label}</span>
        <span className="block text-[11px] text-muted-foreground">{OWNER_TEXT[n.owner]}</span>
      </span>
      {actionable && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden />}
    </>
  )
  const cls = cn(box, "group bg-card transition", actionable && "hover:border-primary/60 hover:bg-primary-soft/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", urgent && "border-danger/40 bg-danger-soft/40", !actionable && "bg-muted/40")
  const secondary = (n.key === "remind" || n.key === "followUp") && (
    onAction
      ? <button type="button" onClick={(e) => { e.stopPropagation(); onAction("confirmPayment") }} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-text hover:underline"><BadgeCheck className="size-3" /> Mark as paid</button>
      : null
  )
  if (!actionable) return <span className={cls}>{inner}</span>
  return (
    <div>
      {onAction ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onAction(n.key) }} className={cls}>{inner}</button>
      ) : (
        <Link to={`/finance?project=${p.id}&action=${n.key}`} onClick={(e) => e.stopPropagation()} className={cls}>{inner}</Link>
      )}
      {secondary}
    </div>
  )
}

/** Amount (invoice total or client price), the amount still due, and the due date chip. */
export function AmountDueCell({ p }: { p: ProjectRow }) {
  const inv = p.billing.invoice
  const b = p.billingInsight
  if (!inv && !p.pricing) return <div className="text-right text-xs text-warning">Price not set</div>
  const cur = inv?.currency ?? p.pricing!.currency
  const total = inv?.total ?? p.priceTotal
  const due = p.billing.status === "Paid" ? 0 : total
  return (
    <div className="space-y-1 text-right">
      <Money amount={total} currency={cur} className="block font-semibold" />
      <p className="text-[11px] text-muted-foreground">{inv ? "Invoice total incl. tax" : "Client price, excl. tax"}</p>
      <p className={cn("text-xs", due ? "text-foreground" : "text-success")}>
        {p.billing.status === "Paid" ? "Nothing due" : <>Due <Money amount={due} currency={cur} className="font-semibold" /></>}
      </p>
      {b.due && <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", TONE_CLASSES[b.due.tone])}>{b.due.text}</span>}
      {b.dueDate && <p className="text-[11px] whitespace-nowrap text-muted-foreground">{b.dueDate.label} {formatDate(b.dueDate.date, "dd MMM yyyy")}</p>}
    </div>
  )
}

/** Job completion date (completion mail), or where the job is if not done yet. `withInspector` adds the inspector below 1536px, where the Inspector column is hidden. */
export function CompletionCell({ p, withInspector }: { p: ProjectRow; withInspector?: boolean }) {
  const c = p.completion
  const [date, note] = c.completionEmailSentAt
    ? [formatDate(c.completionEmailSentAt, "dd MMM yyyy"), "Completion mail sent"]
    : c.jobDoneAt ? [formatDate(c.jobDoneAt, "dd MMM yyyy"), "Job done · report awaited"]
      : p.schedule?.dates[0] ? ["—", `Scheduled ${formatDate(p.schedule.dates[0], "dd MMM")}`] : ["—", "Not scheduled"]
  return (
    <div>
      <p className={cn("text-sm", date === "—" && "text-muted-foreground")}>{date}</p>
      <p className="text-[11px] text-muted-foreground">{note}</p>
      {withInspector && <p className="mt-1 max-w-[9rem] truncate text-[11px] text-foreground/80 2xl:hidden" title={p.assignedInspectorName ?? "Not assigned"}>Inspector: {p.assignedInspectorName ?? "not assigned"}</p>}
    </div>
  )
}
