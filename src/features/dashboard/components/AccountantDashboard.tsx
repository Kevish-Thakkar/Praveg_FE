import { Link } from "react-router-dom"
import { BadgeIndianRupee, FileUp, Tag } from "@/components/icons"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChartsToolbar, useCountryFilter } from "@/components/charts/CountryFilter"
import { IncomeTrendChart, OutstandingChart } from "@/components/charts/Charts"
import { EmptyState } from "@/components/common/EmptyState"
import { StatusBadge } from "@/components/common/StatusBadge"
import { Money } from "@/components/common/Money"
import { formatDate } from "@/lib/dates"
import type { DashboardData } from "@/services"
import { useBilling } from "@/features/finance/hooks"
import { ActivityFeed } from "./ActivityFeed"


export function AccountantDashboard({ data }: { data: DashboardData }) {
  const [country, setCountry] = useCountryFilter()
  const c = data.charts[country]
  const rows = useBilling()
  const dueList = (rows.data ?? []).filter((r) => r.status === "Awaiting Payment" && (r.dueState === "Overdue" || r.dueState === "Due soon" || r.dueState === "Due today"))
  const toInvoice = (rows.data ?? []).filter((r) => r.status === "Invoice Pending")
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <ChartsToolbar value={country} onChange={setCountry} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Invoiced vs received</CardTitle><CardDescription>Last 6 months · {c.currency}</CardDescription></CardHeader>
            <CardContent><IncomeTrendChart data={c.income.monthly} currency={c.currency} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Outstanding by client</CardTitle><CardDescription>Unpaid invoices · {c.currency}</CardDescription></CardHeader>
            <CardContent><OutstandingChart data={c.income.outstandingByClient} currency={c.currency} /></CardContent>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments to chase</CardTitle>
            <CardDescription>Due within {7} days or overdue — reminder / follow-up suggested</CardDescription>
            <CardAction><Button asChild variant="ghost" size="sm"><Link to="/finance?tab=payments">Open</Link></Button></CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {rows.isPending ? <div className="h-24" /> : dueList.length === 0 ? (
              <EmptyState compact icon={BadgeIndianRupee} title="No payments due soon" />
            ) : (
              <ul className="divide-y">
                {dueList.map((r) => (
                  <li key={r.projectId}>
                    <Link to={`/finance?tab=payments&project=${r.projectId}`} className="flex items-center gap-3 px-6 py-3 text-foreground hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.clientName}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.invoice?.number} · due {formatDate(r.invoice?.dueDate)}</span>
                      </span>
                      <span className="text-right">
                        <Money amount={r.invoice!.total} currency={r.invoice!.currency} className="block text-sm font-semibold" />
                        <StatusBadge status={r.dueState} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ready to invoice</CardTitle>
            <CardDescription>Completion mail sent to the client</CardDescription>
            <CardAction><Button asChild variant="ghost" size="sm"><Link to="/finance?tab=invoice">Open</Link></Button></CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {rows.isPending ? <div className="h-24" /> : toInvoice.length === 0 ? (
              <EmptyState compact icon={FileUp} title="Nothing to invoice" />
            ) : (
              <ul className="divide-y">
                {toInvoice.map((r) => (
                  <li key={r.projectId}>
                    <Link to={`/finance?tab=invoice&project=${r.projectId}`} className="flex items-center gap-3 px-6 py-3 text-foreground hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.code} · {r.clientName} · {r.paymentTermsDays}-day terms</span>
                      </span>
                      <Money amount={r.priceTotal} currency={r.currency} className="text-sm font-semibold" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Client price requests</CardTitle>
            <CardDescription>Coordinators can't send CVs until a price is set</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {data.pricingQueue.length === 0 ? (
              <EmptyState compact icon={Tag} title="No price requests" />
            ) : (
              <ul className="divide-y">
                {data.pricingQueue.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}?panel=pricing`} className="flex items-center gap-3 px-6 py-3 text-foreground hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.code} · {p.clientName} · {p.serviceName}</span>
                      </span>
                      {p.pricingRequestedAt ? <StatusBadge status="Requested" /> : <span className="text-xs text-muted-foreground">Not yet requested</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent><ActivityFeed limit={5} /></CardContent>
        </Card>
      </div>
    </div>
  )
}
