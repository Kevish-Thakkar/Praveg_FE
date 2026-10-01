import { useEffect, useState } from "react"
import { Check, FileText, MailPlus, Trash2, X } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common/StatusBadge"
import { UserAvatar } from "@/components/common/UserAvatar"
import { EmptyState } from "@/components/common/EmptyState"
import { Spinner } from "@/components/feedback/LoadingState"
import { DIALOG_MOBILE_BODY, DIALOG_MOBILE_FOOTER, DIALOG_MOBILE_FULLSCREEN } from "@/components/dialogs/FormDialog"
import { formatDateTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/services"
import type { CandidateRow } from "./types"
import { InspectorMatches } from "../InspectorMatches"
import { useRecordAvailability, useRemoveCandidate, useRequestAvailability } from "../../hooks"

export function RequestInspectorsDialog({ p, open, onOpenChange }: { p: ProjectRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const req = useRequestAvailability()
  useEffect(() => { if (open) setSelected(new Set()) }, [open])
  return (
    <Dialog open={open} onOpenChange={(o) => !req.isPending && onOpenChange(o)}>
      <DialogContent className={cn(DIALOG_MOBILE_FULLSCREEN, "sm:max-w-3xl")}>
        <DialogHeader className="border-b px-4 pt-5 pb-4 pr-12 text-left sm:px-6 sm:pt-6">
          <DialogTitle>Request inspector availability</DialogTitle>
          <DialogDescription>Each selected inspector receives the availability & confirmation email for {p.code}.</DialogDescription>
        </DialogHeader>
        <div className={DIALOG_MOBILE_BODY}>
          <InspectorMatches site={p.site} skills={p.requiredSkills} projectId={p.id} selected={selected} onSelectedChange={setSelected} />
        </div>
        <DialogFooter className={DIALOG_MOBILE_FOOTER}>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={req.isPending}>Cancel</Button>
          <Button disabled={!selected.size || req.isPending} onClick={() => req.mutate({ projectId: p.id, inspectorIds: [...selected] }, { onSuccess: () => onOpenChange(false) })}>
            {req.isPending ? <Spinner /> : <MailPlus />} Send to {selected.size || ""} inspector{selected.size === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Step 2 — who was asked, who replied. Replies are recorded by the coordinator (production: reply link in the email). */
export function CandidateList({ candidates, canEdit, locked }: { candidates: CandidateRow[]; canEdit: boolean; locked: boolean }) {
  const record = useRecordAvailability()
  const remove = useRemoveCandidate()
  if (!candidates.length) return <EmptyState compact title="No inspectors requested yet" description="Request availability from nearby inspectors." />
  return (
    <ul className="divide-y rounded-xl border">
      {candidates.map((c) => (
        <li key={c.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={c.inspector.name} className="size-9" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {c.inspector.name}
                <StatusBadge status={c.availability} />
                {c.cvSentAt && <span className="inline-flex items-center gap-1 rounded bg-violet-soft px-1.5 py-0.5 text-[11px] font-medium text-violet"><FileText className="size-3" /> CV sent</span>}
                {c.outcome && <StatusBadge status={c.outcome} dot={false} />}
              </p>
              <p className="truncate text-xs text-muted-foreground">{c.inspector.address.city} · {c.distanceKm} km · {c.inspector.skills.slice(0, 3).join(", ")}</p>
              <p className="text-[11px] text-muted-foreground">Requested {formatDateTime(c.requestedAt)}{c.respondedAt ? ` · replied ${formatDateTime(c.respondedAt)}` : ""}</p>
            </div>
          </div>
          {canEdit && !locked && !c.cvSentAt && (
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant={c.availability === "Available" ? "default" : "outline"} disabled={record.isPending} onClick={() => record.mutate({ candidateId: c.id, availability: "Available" })}><Check /> Available</Button>
              <Button size="sm" variant={c.availability === "Not Available" ? "secondary" : "outline"} disabled={record.isPending} onClick={() => record.mutate({ candidateId: c.id, availability: "Not Available" })}><X /> Not available</Button>
              <Button size="icon" variant="ghost" className="size-8" aria-label={`Remove ${c.inspector.name}`} disabled={remove.isPending} onClick={() => remove.mutate(c.id)}><Trash2 /></Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
