import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FieldValues, Path, UseFormReturn } from "react-hook-form"

export interface StepDef<T extends FieldValues> {
  id: string
  title: string
  description?: string
  /** fields validated before leaving this step */
  fields?: Path<T>[]
  optional?: boolean
}

/**
 * Stepper state for a react-hook-form form.
 *  - Continue validates only the current step's fields
 *  - completed / error state per step drives the stepper UI
 *  - optional draft saving in this browser (new records only), restored on the next visit
 */
export function useFormStepper<T extends FieldValues>({ form, steps, draftKey }: { form: UseFormReturn<T>; steps: StepDef<T>[]; draftKey?: string }) {
  const [current, setCurrent] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [invalid, setInvalid] = useState<Set<string>>(new Set())
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [restoredAt, setRestoredAt] = useState<string | null>(null)
  const restored = useRef(false)
  const storageKey = draftKey ? `praveg-draft:${draftKey}` : null

  // restore a saved draft once
  useEffect(() => {
    if (!storageKey || restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const draft = JSON.parse(raw) as { values: T; step: number; completed: string[]; savedAt: string }
      form.reset(draft.values)
      setCurrent(Math.min(draft.step, steps.length - 1))
      setCompleted(new Set(draft.completed))
      setRestoredAt(draft.savedAt)
    } catch {
      /* storage unavailable or old draft — start fresh */
    }
  }, [storageKey, form, steps.length])

  const validateStep = useCallback(async (i: number) => {
    const s = steps[i]
    if (!s?.fields?.length) return true
    const ok = await form.trigger(s.fields, { shouldFocus: true })
    setInvalid((prev) => { const n = new Set(prev); if (ok) n.delete(s.id); else n.add(s.id); return n })
    return ok
  }, [form, steps])

  const next = useCallback(async () => {
    if (!(await validateStep(current))) return false
    setCompleted((prev) => new Set(prev).add(steps[current]!.id))
    setCurrent((c) => Math.min(c + 1, steps.length - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
    return true
  }, [current, steps, validateStep])

  const back = useCallback(() => { setCurrent((c) => Math.max(0, c - 1)); window.scrollTo({ top: 0, behavior: "smooth" }) }, [])

  /** jump to a step: always allowed backwards; forwards only through completed steps */
  const goTo = useCallback(async (i: number) => {
    if (i <= current) return setCurrent(i)
    for (let k = current; k < i; k++) {
      if (!(await validateStep(k))) return setCurrent(k)
      setCompleted((prev) => new Set(prev).add(steps[k]!.id))
    }
    setCurrent(i)
  }, [current, steps, validateStep])

  /** validate every step (before submit); moves to the first step with errors */
  const validateAll = useCallback(async () => {
    for (let i = 0; i < steps.length; i++) {
      if (!(await validateStep(i))) { setCurrent(i); return false }
    }
    return true
  }, [steps.length, validateStep])

  const saveDraft = useCallback(() => {
    if (!storageKey) return
    const savedAt = new Date().toISOString()
    try {
      localStorage.setItem(storageKey, JSON.stringify({ values: form.getValues(), step: current, completed: [...completed], savedAt }))
      setDraftSavedAt(savedAt)
    } catch {
      /* ignore — draft saving is best effort */
    }
  }, [storageKey, form, current, completed])

  const clearDraft = useCallback(() => {
    if (!storageKey) return
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
    setRestoredAt(null)
    setDraftSavedAt(null)
  }, [storageKey])

  const state = useMemo(() => steps.map((s, i) => ({
    ...s,
    index: i,
    status: invalid.has(s.id) ? "error" as const : i === current ? "current" as const : completed.has(s.id) ? "complete" as const : "upcoming" as const,
  })), [steps, invalid, current, completed])

  return {
    current, step: steps[current]!, isFirst: current === 0, isLast: current === steps.length - 1,
    steps: state, next, back, goTo, validateAll, saveDraft, clearDraft, draftSavedAt, restoredAt,
    progress: Math.round((completed.size / steps.length) * 100),
  }
}
