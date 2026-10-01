import { useId, useState, type KeyboardEvent, type ReactNode } from "react"
import { Plus, X } from "@/components/icons"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  suggestions?: { email: string; name: string }[]
  error?: string
  /** mail-client row: label on the left, no box (used inside the inline reply editor) */
  inline?: boolean
  /** extra controls at the end of an inline row (e.g. Cc / Bcc toggles) */
  trailing?: ReactNode
}

export function RecipientsInput({ label, value, onChange, suggestions = [], error, inline, trailing }: Props) {
  const id = useId()
  const [draft, setDraft] = useState("")
  const [invalid, setInvalid] = useState(false)

  const commit = () => {
    const v = draft.trim().replace(/[,;]$/, "")
    if (!v) return
    if (!EMAIL.test(v)) return setInvalid(true)
    if (!value.includes(v)) onChange([...value, v])
    setDraft("")
    setInvalid(false)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", ";", "Tab"].includes(e.key) && draft.trim()) {
      e.preventDefault()
      commit()
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  const unused = suggestions.filter((s) => !value.includes(s.email))

  const chips = (
    <>
      {value.map((v) => (
        <span key={v} className="inline-flex max-w-full items-center gap-1 rounded bg-primary-soft py-0.5 pr-1 pl-2 text-xs text-primary-text">
          <span className="truncate">{v}</span>
          <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="shrink-0 rounded p-0.5 hover:bg-primary/15" aria-label={`Remove ${v}`}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setInvalid(false) }}
        onKeyDown={onKey}
        onBlur={commit}
        type="email"
        placeholder={value.length ? "" : inline ? "" : "Type an email and press Enter"}
        className={cn("flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground", inline ? "min-w-16" : "min-w-32")}
        aria-invalid={invalid || !!error}
        aria-label={inline ? label : undefined}
      />
    </>
  )
  const message = (invalid || error) && <p className={cn("text-xs text-destructive", inline && "px-3 pb-1.5")}>{invalid ? "Enter a valid email address" : error}</p>

  if (inline) {
    return (
      <div className="border-b">
        <div className="flex items-start gap-2 px-3 py-1.5">
          <label htmlFor={id} className="w-8 shrink-0 pt-1 text-sm text-muted-foreground">{label}</label>
          <div className="flex min-h-7 min-w-0 flex-1 flex-wrap items-center gap-1.5">{chips}</div>
          {trailing}
        </div>
        {message}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className={cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50", (invalid || error) && "border-destructive")}>
        {chips}
      </div>
      {message}
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s.email} type="button" onClick={() => onChange([...value, s.email])} className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground">
              <Plus className="size-3" /> {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
