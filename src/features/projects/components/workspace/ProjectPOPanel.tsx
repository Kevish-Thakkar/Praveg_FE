import { ReceiptText } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { Money } from "@/components/common/Money"
import { StatusBadge } from "@/components/common/StatusBadge"
import { formatDate } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import type { PORow, ProjectRow } from "@/services"
import type { ResolvedAction } from "./useProjectActions"

/** Purchase orders tab: the client's PO for this job, compared with the client price. */
export function ProjectPOPanel({ p, pos, record }: { p: ProjectRow; pos: PORow[]; record: ResolvedAction | null }) {
  if (!pos.length) return <EmptyState icon={ReceiptText} title="No PO record yet" description="A PO record opens automatically when an inspector is assigned. If the client's PO has already arrived, create it now." action={record && <Button onClick={record.run}><ReceiptText /> {record.label}</Button>} />
  return (
    <ul className="space-y-4">
      {pos.map((po) => {
        const matches = po.status === "Awaiting PO" || (po.amount === p.priceTotal)
        return (
          <li key={po.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{po.poNumber || "PO not received yet"}</p>
                  <StatusBadge status={po.status} />
                </div>
                <p className="text-sm text-muted-foreground">{po.issueDate ? `Issued ${formatDate(po.issueDate)}` : "Waiting for the client's purchase order"}</p>
              </div>
              {record && <Button variant={po.poNumber ? "outline" : "default"} onClick={record.run}><ReceiptText /> {record.label}</Button>}
            </div>
            <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted-foreground">PO amount</dt><dd className="mt-0.5 font-medium"><Money amount={po.amount} currency={po.currency} /></dd></div>
              <div><dt className="text-xs text-muted-foreground">Client price</dt><dd className="mt-0.5 font-medium">{p.pricing ? formatMoney(p.priceTotal, p.pricing.currency) : "Not set"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Check</dt><dd className={matches ? "mt-0.5 font-medium text-success" : "mt-0.5 font-medium text-warning"}>{po.status === "Awaiting PO" ? "—" : matches ? "Matches the client price" : "Differs from the client price"}</dd></div>
            </dl>
            {po.notes && <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{po.notes}</p>}
          </li>
        )
      })}
    </ul>
  )
}
