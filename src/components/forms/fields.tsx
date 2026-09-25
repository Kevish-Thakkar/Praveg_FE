import { useState, type ReactNode } from "react"
import type { Control, FieldPath, FieldValues } from "react-hook-form"
import { format, parseISO } from "date-fns"
import { CalendarIcon, Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toISODate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: string
  hint?: string
}

interface BaseProps<T extends FieldValues> {
  control: Control<T>
  name: FieldPath<T>
  label: string
  required?: boolean
  description?: ReactNode
  className?: string
  disabled?: boolean
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <FormLabel>
      {label}
      {required && (
        <span className="text-danger" aria-hidden>
          *
        </span>
      )}
      {required && <span className="sr-only">(required)</span>}
    </FormLabel>
  )
}

export function TextField<T extends FieldValues>({ control, name, label, required, description, className, disabled, type = "text", placeholder, autoComplete }: BaseProps<T> & { type?: string; placeholder?: string; autoComplete?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Input {...field} value={field.value ?? ""} type={type} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} aria-required={required} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function NumberField<T extends FieldValues>({ control, name, label, required, description, className, disabled, prefix, min = 0, step = "any" }: BaseProps<T> & { prefix?: string; min?: number; step?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <div className="relative">
            {prefix && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-medium text-muted-foreground">{prefix}</span>}
            <FormControl>
              <Input
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="number"
                inputMode="decimal"
                min={min}
                step={step}
                disabled={disabled}
                aria-required={required}
                className={cn("tabular-nums", prefix && "pl-12")}
                value={field.value === undefined || field.value === null || Number.isNaN(field.value) ? "" : String(field.value)}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </FormControl>
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function TextareaField<T extends FieldValues>({ control, name, label, required, description, className, disabled, rows = 3, placeholder }: BaseProps<T> & { rows?: number; placeholder?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Textarea {...field} value={field.value ?? ""} rows={rows} placeholder={placeholder} disabled={disabled} aria-required={required} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export function SelectField<T extends FieldValues>({ control, name, label, required, description, className, disabled, options, placeholder = "Select…", onValueChange }: BaseProps<T> & { options: readonly (Option | string)[]; placeholder?: string; onValueChange?: (v: string) => void }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FieldLabel label={label} required={required} />
          {/* Radix fires onValueChange("") from its hidden native <select> when the form is reset
              before the new value's item has mounted — ignore it so reset values are kept. */}
          <Select
            value={field.value ?? ""}
            onValueChange={(v) => {
              if (v === "" || v === field.value) return
              onValueChange?.(v)
              field.onChange(v)
            }}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full" aria-required={required} onBlur={field.onBlur}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
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
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Searchable single select (clients, vendors, inspectors…) */
export function ComboboxField<T extends FieldValues>({ control, name, label, required, description, className, disabled, options, placeholder = "Select…", searchPlaceholder = "Search…", emptyText = "No results" }: BaseProps<T> & { options: Option[]; placeholder?: string; searchPlaceholder?: string; emptyText?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = options.find((o) => o.value === field.value)
        return (
          <FormItem className={cn("flex flex-col", className)}>
            <FieldLabel label={label} required={required} />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" aria-expanded={open} aria-required={required} disabled={disabled} className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}>
                    <span className="truncate">{selected?.label ?? placeholder}</span>
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList>
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                      {options.map((o) => (
                        <CommandItem
                          key={o.value}
                          value={`${o.label} ${o.hint ?? ""}`}
                          onSelect={() => {
                            field.onChange(o.value)
                            setOpen(false)
                          }}
                        >
                          <Check className={cn("text-primary-text", o.value === field.value ? "opacity-100" : "opacity-0")} />
                          <div className="min-w-0">
                            <p className="truncate">{o.label}</p>
                            {o.hint && <p className="truncate text-xs text-muted-foreground">{o.hint}</p>}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

/** Multi select with chips */
export function MultiSelectField<T extends FieldValues>({ control, name, label, required, description, className, disabled, options, placeholder = "Select…" }: BaseProps<T> & { options: Option[]; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? []
        const toggle = (v: string) => field.onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
        return (
          <FormItem className={cn("flex flex-col", className)}>
            <FieldLabel label={label} required={required} />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-auto min-h-9 w-full justify-between py-1.5 font-normal">
                    <span className="flex flex-wrap gap-1">
                      {value.length ? (
                        value.map((v) => (
                          <Badge key={v} variant="secondary" className="border bg-muted font-normal">
                            {options.find((o) => o.value === v)?.label ?? v}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                      )}
                    </span>
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search…" />
                  <CommandList>
                    <CommandEmpty>No results</CommandEmpty>
                    <CommandGroup>
                      {options.map((o) => (
                        <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                          <Check className={cn("text-primary-text", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                          {o.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

/** Single select that also accepts a typed value (e.g. a city not in the list). */
export function ComboboxCreatableField<T extends FieldValues>({ control, name, label, required, description, className, disabled, options, placeholder = "Select…", onCreateHint = "Add" }: BaseProps<T> & { options: Option[]; placeholder?: string; onCreateHint?: string }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const typed = search.trim()
        const exists = options.some((o) => o.label.toLowerCase() === typed.toLowerCase())
        return (
          <FormItem className={cn("flex flex-col", className)}>
            <FieldLabel label={label} required={required} />
            <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" aria-expanded={open} aria-required={required} disabled={disabled} className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                    <span className="truncate">{field.value || placeholder}</span>
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search or type…" value={search} onValueChange={setSearch} />
                  <CommandList>
                    <CommandEmpty>{typed ? "Press the option below to use it" : "No results"}</CommandEmpty>
                    <CommandGroup>
                      {options.map((o) => (
                        <CommandItem key={o.value} value={o.label} onSelect={() => { field.onChange(o.value); setOpen(false); setSearch("") }}>
                          <Check className={cn("text-primary-text", o.value === field.value ? "opacity-100" : "opacity-0")} />
                          {o.label}
                        </CommandItem>
                      ))}
                      {typed && !exists && (
                        <CommandItem value={`__create ${typed}`} onSelect={() => { field.onChange(typed); setOpen(false); setSearch("") }}>
                          <Plus className="text-primary-text" /> {onCreateHint} "{typed}"
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

/** Multi select with chips where users can add a new option (skills). */
export function CreatableMultiSelectField<T extends FieldValues>({ control, name, label, required, description, className, disabled, options, placeholder = "Select…", onCreate }: BaseProps<T> & { options: Option[]; placeholder?: string; onCreate?: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? []
        const toggle = (v: string) => field.onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
        const typed = search.trim()
        const exists = [...options.map((o) => o.label), ...value].some((l) => l.toLowerCase() === typed.toLowerCase())
        const create = () => {
          if (typed.length < 2) return
          onCreate?.(typed)
          field.onChange([...value, typed])
          setSearch("")
        }
        const all = [...options, ...value.filter((v) => !options.some((o) => o.value === v)).map((v) => ({ value: v, label: v }))]
        return (
          <FormItem className={cn("flex flex-col", className)}>
            <FieldLabel label={label} required={required} />
            <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch("") }}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled} className="h-auto min-h-9 w-full justify-between py-1.5 font-normal">
                    <span className="flex min-w-0 flex-wrap gap-1">
                      {value.length ? value.map((v) => <Badge key={v} variant="secondary" className="border bg-primary-soft font-normal text-primary-text">{v}</Badge>) : <span className="text-muted-foreground">{placeholder}</span>}
                    </span>
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search or add a skill…" value={search} onValueChange={setSearch} onKeyDown={(e) => { if (e.key === "Enter" && typed && !exists) { e.preventDefault(); create() } }} />
                  <CommandList>
                    <CommandEmpty>{typed.length >= 2 ? "Not in the list yet" : "No results"}</CommandEmpty>
                    <CommandGroup>
                      {typed.length >= 2 && !exists && (
                        <CommandItem value={`__create ${typed}`} onSelect={create} className="text-primary-text">
                          <Plus /> Add new skill "{typed}"
                        </CommandItem>
                      )}
                      {all.map((o) => (
                        <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                          <Check className={cn("text-primary-text", value.includes(o.value) ? "opacity-100" : "opacity-0")} />
                          {o.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function DateField<T extends FieldValues>({ control, name, label, required, description, className, disabled }: BaseProps<T>) {
  const [open, setOpen] = useState(false)
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-col", className)}>
          <FieldLabel label={label} required={required} />
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button variant="outline" disabled={disabled} className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                  <CalendarIcon className="text-muted-foreground" />
                  {field.value ? format(parseISO(field.value), "dd MMM yyyy") : "Pick a date"}
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? parseISO(field.value) : undefined}
                defaultMonth={field.value ? parseISO(field.value) : undefined}
                onSelect={(d) => {
                  field.onChange(d ? toISODate(d) : null)
                  setOpen(false)
                }}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Job dates (one job can span several dates) */
export function MultiDateField<T extends FieldValues>({ control, name, label, required, description, className, disabled }: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value: string[] = field.value ?? []
        return (
          <FormItem className={cn("flex flex-col", className)}>
            <FieldLabel label={label} required={required} />
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" disabled={disabled} className={cn("w-full justify-start font-normal", !value.length && "text-muted-foreground")}>
                    <CalendarIcon className="text-muted-foreground" />
                    {value.length ? `${value.length} date${value.length === 1 ? "" : "s"} selected` : "Pick one or more dates"}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="multiple"
                  selected={value.map((v) => parseISO(v))}
                  defaultMonth={value[0] ? parseISO(value[0]) : undefined}
                  onSelect={(ds) => field.onChange((ds ?? []).map(toISODate).sort())}
                />
              </PopoverContent>
            </Popover>
            {value.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {value.map((v) => (
                  <Badge key={v} variant="outline" className="gap-1 bg-card pr-1 font-normal">
                    {format(parseISO(v), "dd MMM yyyy")}
                    <button type="button" className="rounded p-0.5 hover:bg-muted" aria-label={`Remove ${v}`} onClick={() => field.onChange(value.filter((x) => x !== v))}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}

export function SwitchField<T extends FieldValues>({ control, name, label, description, className, disabled }: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("flex flex-row items-center justify-between gap-4 rounded-lg border p-3", className)}>
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch checked={!!field.value} onCheckedChange={field.onChange} disabled={disabled} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>{children}</div>
}
