import { memo } from "react"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"

export const Money = memo(function Money({ amount, currency, className }: { amount: number; currency: string; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(amount, currency)}</span>
})
