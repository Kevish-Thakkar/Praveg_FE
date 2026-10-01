import type { DocumentCategory, EmailKind } from "@/types/domain"

const NEUTRAL = "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300"

export const EMAIL_KIND_CLS: Record<EmailKind, string> = {
  "Availability Request": "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  Interview: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Inspector Confirmation": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Job Reminder": "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Report Request": "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "CVs to Client": "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  Completion: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  "Payment Reminder": "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  "Payment Follow-up": "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  General: NEUTRAL,
}

export const DOC_CATEGORY_CLS: Record<DocumentCategory, string> = {
  CV: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Certificate: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "Inspector Confirmation": "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "Technical Document": "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  Report: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  "Out Document": "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  "Purchase Order": "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  Invoice: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  Template: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  Other: NEUTRAL,
}

export const docCategoryCls = (c: string) => DOC_CATEGORY_CLS[c as DocumentCategory] ?? NEUTRAL
