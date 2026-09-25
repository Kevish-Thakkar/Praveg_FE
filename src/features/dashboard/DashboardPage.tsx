import { Link } from "react-router-dom"
import { Bell, Building2, CalendarClock, FileSearch, HardHat, Inbox, MailQuestion, Plus, Send, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { KpiTile } from "@/components/common/KpiTile"
import { Can } from "@/components/common/Can"
import { CardsSkeleton, TableSkeleton } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { BrandLogo } from "@/components/common/BrandLogo"
import { useCurrentUser } from "@/store/session.store"
import { formatDate } from "@/lib/dates"
import type { DashboardData } from "@/services"
import { useDashboard } from "./hooks"
import { ActionItemsCard, UpcomingCard } from "./components/Panels"
import { ChartsToolbar, CountryFilter, useCountryFilter } from "@/components/charts/CountryFilter"
import { IncomeTrendChart, OutstandingChart, ServiceChart, StageChart } from "@/components/charts/Charts"
import { IncomeKpis } from "@/features/finance/components/IncomeKpis"
import { AccountantDashboard } from "./components/AccountantDashboard"
import { ActivityFeed } from "./components/ActivityFeed"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

/** Role-based dashboard. Only in-flight work is shown — completed counts were removed on request. */
export function DashboardPage() {
  const me = useCurrentUser()
  const scope = me.role === "Coordinator" ? "mine" : "all"
  const q = useDashboard(scope)
  const first = me.name.split(" ")[0]
  const urgent = q.data ? q.data.actionItems.filter((a) => a.tone === "danger").length : 0

  return (
    <PageContainer>
      <section className="relative mb-6 overflow-hidden rounded-2xl bg-brand-gradient px-5 py-6 text-white sm:px-8 sm:py-7">
        <div className="bg-grid-white pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent,black)]" aria-hidden />
        <span className="pointer-events-none absolute top-1/2 right-6 hidden size-28 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 p-3 ring-8 ring-white/15 md:flex" aria-hidden>
          <BrandLogo variant="mark" decorative className="size-full" />
        </span>
        <div className="relative max-w-2xl space-y-2 md:pr-36">
          <p className="text-xs font-medium tracking-wide text-white/75 uppercase">{formatDate(new Date().toISOString(), "EEEE, dd MMMM yyyy")} · {me.role}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {first}</h1>
          <p className="text-sm text-white/85">
            {me.role === "Accountant"
              ? "Client prices to set, invoices to upload and payments to follow up."
              : q.data
                ? `${q.data.actionItems.length} open job${q.data.actionItems.length === 1 ? "" : "s"} need an action${urgent ? ` — ${urgent} overdue` : ""}.`
                : "Loading your work…"}
          </p>
          {me.role !== "Accountant" && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Can module="projects" action="create">
                <Button asChild className="bg-white text-[#1e56c8] hover:bg-white/90"><Link to="/projects/new"><Plus /> New inquiry</Link></Button>
              </Can>
              <Button asChild variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/projects"><FileSearch /> Project board</Link></Button>
            </div>
          )}
        </div>
      </section>

      {q.isPending ? (
        <div className="space-y-6"><CardsSkeleton /><div className="grid gap-4 lg:grid-cols-2"><Card><TableSkeleton rows={4} /></Card><Card><TableSkeleton rows={4} /></Card></div></div>
      ) : q.isError ? (
        <Card><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></Card>
      ) : me.role === "Accountant" ? (
        <AccountantDashboard data={q.data} />
      ) : (
        <OperationsView data={q.data} superAdmin={me.role === "Super Admin"} />
      )}
    </PageContainer>
  )
}

function OperationsView({ data, superAdmin }: { data: DashboardData; superAdmin: boolean }) {
  const k = data.kpis
  const [country, setCountry] = useCountryFilter()
  const c = data.charts[country]
  return (
    <div className="space-y-6">
      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="New inquiries" value={k.newInquiries} hint="Request inspector availability" icon={Inbox} theme="sky" to="/projects?stage=Inquiry" />
        <KpiTile label="Awaiting replies" value={k.awaitingReplies} hint="Inspector availability requests" icon={MailQuestion} theme="royal" to="/projects?stage=Inspector%20Assigned" />
        <KpiTile label="With client" value={k.withClient} hint="CVs sent / interview pending" icon={Send} theme="violet" to="/projects?stage=CVs%20Sent" />
        <KpiTile label="Jobs in next 7 days" value={k.jobsThisWeek} hint="Automatic reminders scheduled" icon={CalendarClock} theme="emerald" to="/calendar" />
        <KpiTile label="Reports awaited" value={k.reportsAwaited} hint={k.overdueReminders ? `${k.overdueReminders} overdue reminder(s)` : "From inspectors after the job"} icon={k.overdueReminders ? Bell : FileSearch} theme={k.overdueReminders ? "rose" : "amber"} to="/projects?stage=Job%20Scheduled" />
      </section>

      {superAdmin && data.income && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Income</h2>
            <CountryFilter value={country} onChange={setCountry} />
            <span className="text-xs text-muted-foreground">Same filter as the graphs below</span>
          </div>
          <IncomeKpis income={data.income} country={country} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3"><ActionItemsCard items={data.actionItems} /></div>
        <div className="min-w-0 lg:col-span-2"><UpcomingCard jobs={data.upcomingJobs} interviews={data.interviews} /></div>
      </div>

      <section className="space-y-4">
        <ChartsToolbar value={country} onChange={setCountry} />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Open projects by stage</CardTitle><CardDescription>{country === "India" ? "India" : "UAE"} · where work is sitting now</CardDescription></CardHeader>
            <CardContent><StageChart data={c.pipeline} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Open projects by service</CardTitle><CardDescription>{country === "India" ? "India" : "UAE"} · services requested</CardDescription></CardHeader>
            <CardContent><ServiceChart data={c.services} /></CardContent>
          </Card>
          {superAdmin && (
            <>
              <Card>
                <CardHeader><CardTitle>Invoiced vs received</CardTitle><CardDescription>Last 6 months · {c.currency}</CardDescription></CardHeader>
                <CardContent><IncomeTrendChart data={c.income.monthly} currency={c.currency} /></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Outstanding by client</CardTitle><CardDescription>Unpaid invoices · {c.currency}</CardDescription></CardHeader>
                <CardContent><OutstandingChart data={c.income.outstandingByClient} currency={c.currency} /></CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent><ActivityFeed limit={5} /></CardContent>
        </Card>
        {superAdmin ? (
          <Card>
            <CardHeader><CardTitle>Master data</CardTitle><CardDescription>Maintained by coordinators</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { label: "Users", value: `${data.organization.activeUsers}/${data.organization.users}`, icon: Users, to: "/settings/users", cls: "kpi-royal" },
                { label: "Inspectors", value: data.organization.inspectors, icon: HardHat, to: "/inspectors", cls: "kpi-sky" },
                { label: "Clients", value: data.organization.clients, icon: Building2, to: "/clients", cls: "kpi-emerald" },
                { label: "Vendors", value: data.organization.vendors, icon: Building2, to: "/vendors", cls: "kpi-violet" },
              ].map((x) => (
                <Link key={x.label} to={x.to} className={`flex items-center gap-3 rounded-xl p-3 text-foreground transition hover:-translate-y-0.5 ${x.cls}`}>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white/80"><x.icon className="size-4 text-foreground/70" aria-hidden /></span>
                  <span><span className="block text-lg leading-tight font-bold tabular-nums">{x.value}</span><span className="text-xs text-foreground/70">{x.label}</span></span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Tips</CardTitle><CardDescription>How the flow works</CardDescription></CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                <li>Create the inquiry — nearby inspectors with matching skills are listed automatically.</li>
                <li>Request availability; ask Accounts for the client price.</li>
                <li>Send CVs, record the client's interview or direct selection.</li>
                <li>Schedule the job — the reminder 1 day before goes out automatically.</li>
                <li>After the job, the report request goes out the next morning.</li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
