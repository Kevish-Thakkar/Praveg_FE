import { db } from "@/mock/db"
import { toISODate } from "@/lib/dates"
import { STAGES } from "@/lib/workflow"
import { currentUserId, useSessionStore } from "@/store/session.store"
import { request } from "./api"
import { toProjectRow, type ProjectRow } from "./project.service"
import { toVisitRow, type VisitRow } from "./execution.service"
import { billingSummary, incomeByCurrency, incomeCharts, type BillingSummary, type IncomeCharts, type IncomeCurrency, type IncomeFigures } from "./billing.service"
import type { Country } from "@/types/domain"

const iso = (offset = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return toISODate(d)
}

export interface ActionItem {
  id: string
  label: string
  detail: string
  href: string
  tone: "warning" | "danger" | "info"
  owner: string
}

export interface DashboardData {
  /** Only in-flight work — completed/closed counts are intentionally not shown (v2 feedback). */
  kpis: {
    newInquiries: number
    awaitingReplies: number
    withClient: number
    jobsThisWeek: number
    reportsAwaited: number
    pricingRequests: number
    overdueReminders: number
  }
  pipeline: { stage: string; short: string; count: number }[]
  /** income KPIs, kept separate per currency — Super Admin only (null for other roles) */
  income: Record<IncomeCurrency, IncomeFigures> | null
  /** everything the dashboard graphs need, per country (India → INR, UAE → AED) */
  charts: Record<Country, CountryCharts>
  upcomingJobs: VisitRow[]
  interviews: { projectId: string; code: string; title: string; inspectorName: string; at: string }[]
  actionItems: ActionItem[]
  attention: ProjectRow[]
  billing: BillingSummary
  pricingQueue: ProjectRow[]
  organization: { users: number; activeUsers: number; inspectors: number; clients: number; vendors: number }
}

export interface CountryCharts {
  currency: IncomeCurrency
  pipeline: { stage: string; count: number }[]
  services: { service: string; count: number }[]
  income: IncomeCharts
}

export const COUNTRY_CURRENCY: Record<Country, IncomeCurrency> = { India: "INR", "United Arab Emirates": "AED" }

export const dashboardService = {
  get: (scope: "all" | "mine") =>
    request<DashboardData>(() => {
      const uid = currentUserId()
      const projects = db.projects.filter((p) => scope === "all" || p.coordinatorId === uid)
      const rows = projects.map(toProjectRow)
      const ids = new Set(projects.map((p) => p.id))
      const today = iso()
      const open = rows.filter((r) => r.stage !== "Completed" && r.stage !== "Cancelled")

      const actionItems: ActionItem[] = []
      for (const r of open) {
        const n = r.insight.next
        if (n.key === "none") continue
        const tone = r.insight.due?.tone === "danger" ? "danger" : r.insight.due?.tone === "warning" ? "warning" : "info"
        actionItems.push({ id: r.id, label: `${n.label} — ${r.code}`, detail: `${r.title} · ${r.clientName}`, href: `/projects/${r.id}`, tone, owner: n.owner })
      }
      const order = { danger: 0, warning: 1, info: 2 }
      actionItems.sort((a, b) => order[a.tone] - order[b.tone])

      return {
        kpis: {
          newInquiries: open.filter((r) => r.stage === "Inquiry").length,
          awaitingReplies: db.candidates.filter((c) => ids.has(c.projectId) && c.availability === "Requested").length,
          withClient: open.filter((r) => r.stage === "CVs Sent" || (r.stage === "Inspector Confirmed" && r.selection?.interviewResult === "Pending")).length,
          jobsThisWeek: db.visits.filter((v) => ids.has(v.projectId) && v.status === "Upcoming" && v.date >= today && v.date <= iso(7)).length,
          reportsAwaited: open.filter((r) => r.completion.jobDoneAt && !r.completion.reportUploadedAt).length,
          pricingRequests: db.projects.filter((p) => p.pricingRequestedAt && !p.pricing && p.stage !== "Cancelled").length,
          overdueReminders: db.reminders.filter((r) => r.status === "Open" && r.dueDate < today && (scope === "all" || r.assigneeId === uid)).length,
        },
        income: useSessionStore.getState().user?.role === "Super Admin" ? incomeByCurrency() : null,
        charts: Object.fromEntries((["India", "United Arab Emirates"] as Country[]).map((c) => {
          const inCountry = open.filter((r) => r.site.country === c)
          const services = new Map<string, number>()
          inCountry.forEach((r) => services.set(r.serviceName, (services.get(r.serviceName) ?? 0) + 1))
          return [c, {
            currency: COUNTRY_CURRENCY[c],
            pipeline: STAGES.filter((s) => s.stage !== "Completed").map((s) => ({ stage: s.short, count: inCountry.filter((r) => r.stage === s.stage).length })),
            services: [...services.entries()].map(([service, count]) => ({ service, count })).sort((a, b) => b.count - a.count),
            income: incomeCharts(COUNTRY_CURRENCY[c]),
          }]
        })) as Record<Country, CountryCharts>,
        pipeline: STAGES.filter((s) => s.stage !== "Completed").map((s) => ({ stage: s.stage, short: s.short, count: open.filter((r) => r.stage === s.stage).length })),
        upcomingJobs: db.visits.filter((v) => ids.has(v.projectId) && v.status === "Upcoming" && v.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map(toVisitRow),
        interviews: rows
          .filter((r) => r.selection?.mode === "Interview" && r.selection.interviewResult === "Pending" && r.selection.interviewAt)
          .map((r) => {
            const c = db.candidates.find((x) => x.id === r.selection!.selectedCandidateId)
            return { projectId: r.id, code: r.code, title: r.title, inspectorName: db.inspectors.find((i) => i.id === c?.inspectorId)?.name ?? "—", at: r.selection!.interviewAt! }
          }),
        actionItems: actionItems.slice(0, 8),
        attention: open.filter((r) => r.insight.due && r.insight.due.tone !== "neutral").slice(0, 6),
        billing: billingSummary(),
        pricingQueue: db.projects.filter((p) => !p.pricing && p.stage !== "Cancelled" && p.stage !== "Inquiry").map(toProjectRow),
        organization: {
          users: db.users.length,
          activeUsers: db.users.filter((u) => u.status === "Active").length,
          inspectors: db.inspectors.length,
          clients: db.clients.length,
          vendors: db.vendors.length,
        },
      }
    }),
}
