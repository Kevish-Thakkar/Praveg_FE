import { memo } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMoney, formatMoneyCompact } from "@/lib/format"

/*
 * Palette (validated with the dataviz validator, light surface):
 *   single series  #1E56C8 (contrast ≥ 3:1)
 *   two series     #1F6FB2 invoiced · #D97706 received (CVD ΔE 23.9, all checks pass)
 */
const SINGLE = "#1e56c8"
const INVOICED = "#1f6fb2"
const RECEIVED = "#d97706"

function Empty({ text }: { text: string }) {
  return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">{text}</div>
}

const countConfig = { count: { label: "Projects", color: SINGLE } } satisfies ChartConfig

/** Open projects per workflow stage (single series, value on each bar). */
export const StageChart = memo(function StageChart({ data }: { data: { stage: string; count: number }[] }) {
  if (!data.some((d) => d.count)) return <Empty text="No open projects in this country" />
  return (
    <ChartContainer config={countConfig} className="aspect-auto h-56 w-full" role="img" aria-label={`Open projects by stage: ${data.map((d) => `${d.stage} ${d.count}`).join(", ")}`}>
      <BarChart data={data} margin={{ top: 20, left: -24, right: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="stage" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={36}>
          <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
})

/** Open projects per service (horizontal, sorted, value at bar end). */
export const ServiceChart = memo(function ServiceChart({ data }: { data: { service: string; count: number }[] }) {
  if (!data.length) return <Empty text="No open projects in this country" />
  return (
    <ChartContainer config={countConfig} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 40 + 20) }} role="img" aria-label={`Open projects by service: ${data.map((d) => `${d.service} ${d.count}`).join(", ")}`}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="service" tickLine={false} axisLine={false} width={170} fontSize={12} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
})

/** Invoiced vs received per month, in the selected country's currency. */
export const IncomeTrendChart = memo(function IncomeTrendChart({ data, currency }: { data: { month: string; invoiced: number; received: number }[]; currency: string }) {
  const config = { invoiced: { label: "Invoiced", color: INVOICED }, received: { label: "Received", color: RECEIVED } } satisfies ChartConfig
  if (!data.some((d) => d.invoiced || d.received)) return <Empty text={`No ${currency} invoices in the last 6 months`} />
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full" role="img" aria-label={`${currency} invoiced and received per month: ${data.map((d) => `${d.month} invoiced ${formatMoney(d.invoiced, currency)}, received ${formatMoney(d.received, currency)}`).join("; ")}`}>
      <BarChart data={data} margin={{ top: 12, left: 4, right: 8 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={64} tickFormatter={(v: number) => formatMoneyCompact(v, currency).replace(new RegExp(`^${currency}\\s`), "")} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={(v, name) => (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="text-muted-foreground">{config[name as keyof typeof config]?.label ?? name}</span>
            <span className="font-semibold tabular-nums text-foreground">{formatMoney(Number(v), currency)}</span>
          </div>
        )} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="received" fill="var(--color-received)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  )
})

/** Unpaid invoice totals per client (horizontal, value at bar end). */
export const OutstandingChart = memo(function OutstandingChart({ data, currency }: { data: { client: string; amount: number }[]; currency: string }) {
  const config = { amount: { label: "Outstanding", color: SINGLE } } satisfies ChartConfig
  if (!data.length) return <Empty text={`Nothing outstanding in ${currency}`} />
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 44 + 20) }} role="img" aria-label={`Outstanding ${currency} by client: ${data.map((d) => `${d.client} ${formatMoney(d.amount, currency)}`).join(", ")}`}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 72 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="client" tickLine={false} axisLine={false} width={170} fontSize={12} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent formatter={(v) => <span className="font-semibold tabular-nums">{formatMoney(Number(v), currency)}</span>} />} />
        <Bar dataKey="amount" fill="var(--color-amount)" radius={[0, 4, 4, 0]} maxBarSize={22}>
          <LabelList dataKey="amount" position="right" className="fill-foreground" fontSize={12} formatter={(v: unknown) => formatMoneyCompact(Number(v), currency)} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
})
