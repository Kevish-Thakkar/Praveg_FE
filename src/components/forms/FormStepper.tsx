import type { ReactNode } from "react"
import { AlertCircle, ArrowLeft, ArrowRight, Check, Save } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/feedback/LoadingState"
import { formatDate } from "@/lib/dates"
import { cn } from "@/lib/utils"

export interface StepperStep {
  id: string
  title: string
  description?: string
  optional?: boolean
  index: number
  status: "complete" | "current" | "upcoming" | "error"
}

/**
 * Stepper rail. Desktop (lg+): vertical list on the left of the form card — number, title, optional flag.
 * Below lg: "Step 2 of 5 · Scope" with a progress bar. Completed steps show a check, errors a red mark.
 */
export function FormStepper({ steps, onStep, className }: { steps: StepperStep[]; onStep: (i: number) => void; className?: string }) {
  const cur = steps.find((s) => s.status === "current" || s.status === "error") ?? steps[0]!
  return (
    <nav aria-label="Form steps" className={className}>
      <div className="space-y-2 lg:hidden">
        <p className="text-sm"><span className="text-muted-foreground">Step {cur.index + 1} of {steps.length} · </span><span className="font-semibold">{cur.title}</span></p>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary-strong transition-all" style={{ width: `${((cur.index + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <ol className="hidden lg:block">
        {steps.map((s, i) => (
          <li key={s.id} className="relative pb-5 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute top-9 bottom-0 left-[15px] w-0.5", s.status === "complete" ? "bg-primary-dark" : "bg-border")} />}
            <button
              type="button"
              onClick={() => onStep(i)}
              aria-current={s.status === "current" ? "step" : undefined}
              aria-label={`Step ${i + 1}: ${s.title}${s.status === "complete" ? " (completed)" : s.status === "error" ? " (needs attention)" : ""}`}
              className={cn("group relative flex w-full items-start gap-3 rounded-lg p-0 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none")}
            >
              <span className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
                s.status === "complete" && "bg-primary-dark text-white",
                s.status === "current" && "border-2 border-primary-strong bg-card text-primary-strong shadow-[0_0_0_4px_rgb(30_86_200/0.12)]",
                s.status === "upcoming" && "border-2 border-input bg-card text-muted-foreground group-hover:border-primary-strong/40",
                s.status === "error" && "border-2 border-danger bg-danger-soft text-danger",
              )}>
                {s.status === "complete" ? <Check className="size-4" strokeWidth={3} /> : s.status === "error" ? <AlertCircle className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0 pt-1">
                <span className={cn("block text-sm leading-tight font-medium", s.status === "upcoming" ? "text-muted-foreground" : "text-foreground", s.status === "current" && "font-semibold text-primary-strong", s.status === "error" && "text-danger")}>{s.title}</span>
                {s.optional && <span className="mt-0.5 block text-xs text-muted-foreground">Optional</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * Stepper page body: step rail on the left (sticky), the current step's card on the right with its
 * title, content and the action footer inside the card. Stacks on smaller screens.
 */
export function StepperLayout({ steps, onStep, title, description, actions, footer, children }: {
  steps: StepperStep[]; onStep: (i: number) => void; title: ReactNode; description?: ReactNode; actions?: ReactNode; footer: ReactNode; children: ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6">
      {/* stretches to the step card's height; the step list itself stays in view while scrolling long steps */}
      <aside className="min-w-0 rounded-xl border bg-card p-4 lg:p-5">
        <FormStepper steps={steps} onStep={onStep} className="lg:sticky lg:top-4" />
      </aside>
      <section className="flex min-w-0 flex-col rounded-xl border bg-card">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-1">{actions}</div>}
        </header>
        <div className="min-w-0 flex-1 space-y-5 px-5 py-5">{children}</div>
        {footer}
      </section>
    </div>
  )
}

/** Footer inside the step card (sticky to the viewport bottom): Back · Save draft · Continue / Submit. */
export function StepperFooter({ isFirst, isLast, onBack, onNext, onCancel, onSaveDraft, draftSavedAt, submitLabel, submitting, note }: {
  isFirst: boolean; isLast: boolean; onBack: () => void; onNext: () => void; onCancel: () => void; onSaveDraft?: () => void; draftSavedAt?: string | null
  submitLabel: ReactNode; submitting?: boolean; note?: ReactNode
}) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 rounded-b-xl border-t bg-card/95 px-5 py-3 backdrop-blur">
      <div className="mr-auto min-w-0 text-sm text-muted-foreground">
        {note ?? (draftSavedAt ? `Draft saved ${formatDate(draftSavedAt, "HH:mm")}` : null)}
      </div>
      <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
      {onSaveDraft && <Button type="button" variant="outline" onClick={onSaveDraft} disabled={submitting}><Save /> <span className="hidden sm:inline">Save draft</span></Button>}
      {!isFirst && <Button type="button" variant="outline" onClick={onBack} disabled={submitting}><ArrowLeft /> Back</Button>}
      {isLast ? (
        // distinct keys: React must not reuse the Continue <button> as the submit button, or the click that
        // moves to the last step would also submit the form
        <Button key="submit" type="submit" disabled={submitting}>{submitting && <Spinner />} {submitLabel}</Button>
      ) : (
        <Button key="next" type="button" onClick={onNext}>Continue <ArrowRight /></Button>
      )}
    </div>
  )
}

/** Review step: read-only summary of each section with an Edit link back to that step. */
export function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-lg border">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit}>Edit</Button>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}
