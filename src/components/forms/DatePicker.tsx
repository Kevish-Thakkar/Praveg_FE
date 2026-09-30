import { forwardRef, useState, type ComponentProps } from "react"
import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { toISODate } from "@/lib/dates"
import { cn } from "@/lib/utils"

/**
 * Date trigger styled like the other select-type fields (combobox, select): text on the left,
 * a muted icon on the right, same height, padding and font. Used by DateField, MultiDateField
 * and any standalone date input, so every date control in the app looks the same.
 */
export const DateTrigger = forwardRef<HTMLButtonElement, ComponentProps<typeof Button> & { placeholder?: boolean }>(
  function DateTrigger({ className, children, placeholder, ...props }, ref) {
    return (
      <Button ref={ref} type="button" variant="outline" className={cn("w-full justify-between px-3 font-normal", placeholder && "text-muted-foreground", className)} {...props}>
        <span className="truncate">{children}</span>
        <CalendarIcon className="opacity-50" aria-hidden />
      </Button>
    )
  },
)

/** Standalone single-date picker (ISO yyyy-MM-dd in and out). */
export function DatePicker({ id, value, onChange, min, disabled, placeholder = "Pick a date", invalid, className }: {
  id?: string; value: string | null | undefined; onChange: (v: string | null) => void; min?: string; disabled?: boolean; placeholder?: string; invalid?: boolean; className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseISO(value) : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <DateTrigger id={id} disabled={disabled} placeholder={!value} aria-invalid={invalid || undefined} className={className}>
          {value ? format(parseISO(value), "dd MMM yyyy") : placeholder}
        </DateTrigger>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? (min ? parseISO(min) : undefined)}
          disabled={min ? { before: parseISO(min) } : undefined}
          onSelect={(d) => { onChange(d ? toISODate(d) : null); setOpen(false) }}
        />
      </PopoverContent>
    </Popover>
  )
}
