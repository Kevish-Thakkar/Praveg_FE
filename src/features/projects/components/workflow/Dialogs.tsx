import { useEffect, useState } from "react"
import { DatePicker } from "@/components/forms/DatePicker"
import { parseISO } from "date-fns"
import { BellRing, CalendarCheck, Handshake, MessagesSquare } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { FormDialog } from "@/components/dialogs/FormDialog"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { UserAvatar } from "@/components/common/UserAvatar"
import { daysFromToday, formatDate, toISODate } from "@/lib/dates"
import { toFileMeta } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "./types"
import { useCancelProject, useRecordDecision, useScheduleJob, useUploadReport } from "../../hooks"

/** Step 4 — the client either selects an inspector directly or wants to interview first. */
export function DecisionDialog({ p, candidates, open, onOpenChange }: { p: ProjectRow; candidates: CandidateRow[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const eligible = candidates.filter((c) => c.cvSentAt && c.outcome !== "Not Selected")
  const [mode, setMode] = useState<"Direct" | "Interview">("Direct")
  const [candidateId, setCandidateId] = useState("")
  const [date, setDate] = useState(daysFromToday(1))
  const [time, setTime] = useState("11:00")
  const [touched, setTouched] = useState(false)
  const decide = useRecordDecision()
  useEffect(() => {
    if (open) { setMode("Direct"); setCandidateId(eligible[0]?.id ?? ""); setTouched(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const interviewAt = new Date(`${date}T${time}:00`)
  const past = mode === "Interview" && interviewAt.getTime() < Date.now()
  const invalid = !candidateId || (mode === "Interview" && (!date || !time || past))

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Record client decision" description="Which inspector did the client choose, and do they want to interview first?" formId="decision-form" submitLabel={mode === "Interview" ? "Schedule interview" : "Record selection"} loading={decide.isPending}>
      <form
        id="decision-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          setTouched(true)
          if (invalid) return
          decide.mutate(
            { projectId: p.id, decision: mode === "Direct" ? { mode, candidateId } : { mode, candidateId, interviewAt: interviewAt.toISOString() } },
            { onSuccess: () => onOpenChange(false) },
          )
        }}
      >
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="grid gap-3 sm:grid-cols-2">
          {([
            { v: "Direct", icon: Handshake, t: "Direct selection", d: "Client confirmed the inspector" },
            { v: "Interview", icon: MessagesSquare, t: "Interview first", d: "Client will interview the inspector" },
          ] as const).map((o) => (
            <Label key={o.v} htmlFor={`mode-${o.v}`} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 font-normal", mode === o.v && "border-primary bg-primary-soft/60")}>
              <RadioGroupItem id={`mode-${o.v}`} value={o.v} className="mt-0.5" />
              <span><span className="flex items-center gap-1.5 font-semibold"><o.icon className="size-4 text-primary-text" /> {o.t}</span><span className="text-xs text-muted-foreground">{o.d}</span></span>
            </Label>
          ))}
        </RadioGroup>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Inspector chosen by the client</legend>
          {eligible.length === 0 ? <p className="text-sm text-muted-foreground">No CVs have been sent yet.</p> : (
            <RadioGroup value={candidateId} onValueChange={setCandidateId} className="divide-y rounded-xl border">
              {eligible.map((c) => (
                <Label key={c.id} htmlFor={`c-${c.id}`} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 font-normal">
                  <RadioGroupItem id={`c-${c.id}`} value={c.id} />
                  <UserAvatar name={c.inspector.name} className="size-7" />
                  <span className="min-w-0"><span className="block text-sm font-medium">{c.inspector.name}</span><span className="block truncate text-xs text-muted-foreground">{c.inspector.qualifications.join(", ")}</span></span>
                </Label>
              ))}
            </RadioGroup>
          )}
          {touched && !candidateId && <p className="text-xs text-destructive">Select the inspector</p>}
        </fieldset>
        {mode === "Interview" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="int-date">Interview date</Label><DatePicker id="int-date" value={date} min={toISODate(new Date())} onChange={(v) => setDate(v ?? "")} /></div>
            <div className="space-y-1.5"><Label htmlFor="int-time">Time</Label><Input id="int-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
            {touched && past && <p className="text-xs text-destructive sm:col-span-2">The interview time must be in the future</p>}
            <p className="text-xs text-muted-foreground sm:col-span-2">The inspector is emailed the interview details.</p>
          </div>
        )}
      </form>
    </FormDialog>
  )
}

/** Step 5 — job dates. A reminder email to the inspector is queued for 09:00 the day before the first date. */
export function ScheduleDialog({ p, open, onOpenChange }: { p: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [dates, setDates] = useState<string[]>([])
  const schedule = useScheduleJob()
  useEffect(() => { if (open) setDates(p.schedule?.dates ?? []) }, [open, p.schedule])
  const first = dates[0]
  const reminder = first ? (() => { const d = parseISO(first); d.setDate(d.getDate() - 1); return d })() : null
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Schedule the job" description={`Pick the job day(s) for ${p.assignedInspectorName}.`} formId="schedule-form" submitLabel="Save schedule" loading={schedule.isPending} submitDisabled={!dates.length}>
      <form id="schedule-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); schedule.mutate({ projectId: p.id, dates }, { onSuccess: () => onOpenChange(false) }) }}>
        <div className="flex justify-center rounded-xl border">
          <Calendar mode="multiple" selected={dates.map((d) => parseISO(d))} onSelect={(ds) => setDates((ds ?? []).map(toISODate).sort())} disabled={{ before: new Date() }} defaultMonth={first ? parseISO(first) : new Date()} />
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary-text" /> {dates.length ? dates.map((d) => formatDate(d, "dd MMM")).join(", ") : "No dates selected"}</p>
          {reminder && <p className="flex items-center gap-2 text-muted-foreground"><BellRing className="size-4" /> Automatic reminder to the inspector on {formatDate(toISODate(reminder))} at 09:00</p>}
        </div>
      </form>
    </FormDialog>
  )
}

export function ReportDialog({ p, open, onOpenChange }: { p: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const upload = useUploadReport()
  useEffect(() => { if (open) setFiles([]) }, [open])
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Upload inspection report" description="Upload the report received from the inspector. The first file is saved as the report; any others as supporting documents." formId="report-form" submitLabel={files.length ? `Upload ${files.length} file${files.length === 1 ? "" : "s"}` : "Upload"} loading={upload.isPending} submitDisabled={!files.length}>
      <form id="report-form" onSubmit={(e) => { e.preventDefault(); upload.mutate({ projectId: p.id, files: files.map(toFileMeta) }, { onSuccess: () => onOpenChange(false) }) }}>
        <FileDropzone files={files} onChange={setFiles} />
      </form>
    </FormDialog>
  )
}

export function CancelDialog({ p, open, onOpenChange }: { p: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState("")
  const cancel = useCancelProject()
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Cancel ${p.code}?`} description="The project stays on record with the reason. This cannot be undone in the prototype." formId="cancel-form" submitLabel="Cancel project" loading={cancel.isPending} submitDisabled={reason.trim().length < 3}>
      <form id="cancel-form" className="space-y-2" onSubmit={(e) => { e.preventDefault(); cancel.mutate({ id: p.id, reason }, { onSuccess: () => onOpenChange(false) }) }}>
        <Label htmlFor="cancel-reason">Reason</Label>
        <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client postponed the order" />
      </form>
    </FormDialog>
  )
}
