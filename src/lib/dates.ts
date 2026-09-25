import { format, parseISO, differenceInCalendarDays, isValid } from "date-fns"
import type { ISODate } from "@/types/domain"

export function todayISO(): ISODate {
  return format(new Date(), "yyyy-MM-dd")
}

/** ISO date offset from today — used by mock data so the demo stays current */
export function daysFromToday(offset: number): ISODate {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return format(d, "yyyy-MM-dd")
}

export function dateTimeFromToday(offset: number, hour = 10, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function formatDate(value: string | null | undefined, pattern = "dd MMM yyyy"): string {
  if (!value) return "—"
  const d = parseISO(value)
  return isValid(d) ? format(d, pattern) : "—"
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, "dd MMM yyyy, HH:mm")
}

export function daysUntil(value: ISODate): number {
  return differenceInCalendarDays(parseISO(value), new Date())
}

export function relativeDay(value: ISODate): string {
  const n = daysUntil(value)
  if (n === 0) return "Today"
  if (n === 1) return "Tomorrow"
  if (n === -1) return "Yesterday"
  return n > 0 ? `In ${n} days` : `${Math.abs(n)} days ago`
}

export function toISODate(d: Date): ISODate {
  return format(d, "yyyy-MM-dd")
}
