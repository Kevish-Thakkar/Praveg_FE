import type { ReactNode } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function FilterBar({ children, onReset, showReset, className }: { children: ReactNode; onReset?: () => void; showReset?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
      {children}
      {showReset && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="self-start text-muted-foreground sm:self-auto">
          Clear filters
        </Button>
      )}
    </div>
  )
}

export const ALL = "__all__"

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly (string | { value: string; label: string })[]
  allLabel?: string
  className?: string
}

export function FilterSelect({ label, value, onChange, options, allLabel, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("w-full bg-card sm:w-44", className)}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel ?? `All ${label.toLowerCase()}`}</SelectItem>
        {options.map((o) => {
          const opt = typeof o === "string" ? { value: o, label: o } : o
          return (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
