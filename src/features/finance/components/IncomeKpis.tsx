import { AlarmClock, CircleAlert, FileClock, Hourglass, Wallet } from "lucide-react"
import { IncomeTile } from "@/components/common/IncomeTile"
import type { IncomeCurrency, IncomeFigures } from "@/services"
import type { Country } from "@/types/domain"

/** Income KPIs (Super Admin only). The selected country's amount is the headline; INR and AED are kept apart. */
export function IncomeKpis({ income, country, linkBase = "/finance" }: { income: Record<IncomeCurrency, IncomeFigures>; country: Country; linkBase?: string | null }) {
  const i = income.INR
  const a = income.AED
  const to = (tab: string) => (linkBase ? `${linkBase}?tab=${tab}` : undefined)
  return (
    <section aria-label="Income" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <IncomeTile label={`Received in ${new Date().toLocaleString("en-GB", { month: "short" })}`} icon={Wallet} theme="emerald" inr={i.receivedMonth} aed={a.receivedMonth} country={country} unit="payment" to={to("paid")} />
      <IncomeTile label="Outstanding" icon={Hourglass} theme="sky" inr={i.outstanding} aed={a.outstanding} country={country} unit="invoice" to={to("payments")} />
      <IncomeTile label="Due in 7 days" icon={AlarmClock} theme="violet" inr={i.dueSoon} aed={a.dueSoon} country={country} unit="invoice" to={to("payments")} />
      <IncomeTile label="Overdue" icon={CircleAlert} theme="rose" inr={i.overdue} aed={a.overdue} country={country} unit="invoice" to={to("payments")} />
      <IncomeTile label="To invoice" icon={FileClock} theme="amber" inr={i.toInvoice} aed={a.toInvoice} country={country} unit="project" to={to("invoice")} />
    </section>
  )
}
