import { MailPlus, Send } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SectionHeader } from "@/components/common/SectionHeader"
import { UserAvatar } from "@/components/common/UserAvatar"
import type { ProjectRow } from "@/services"
import { CandidateList } from "../workflow/AvailabilityStep"
import type { CandidateRow } from "../workflow/types"
import type { ResolvedAction } from "./useProjectActions"

/** Inspectors tab: who was asked, who replied, and which CVs go to the client. */
export function InspectorsPanel({ p, candidates, canEdit, request, sendCvs, selection, onSelection }: {
  p: ProjectRow
  candidates: CandidateRow[]
  canEdit: boolean
  request: ResolvedAction | null
  sendCvs: ResolvedAction | null
  selection: Set<string>
  onSelection: (s: Set<string>) => void
}) {
  const idx = p.insight.index
  const unsent = candidates.filter((c) => c.availability === "Available" && !c.cvSentAt)
  const canPick = !!sendCvs && idx >= 1 && idx <= 2 && unsent.length > 0
  const available = candidates.filter((c) => c.availability === "Available").length
  const waiting = candidates.filter((c) => c.availability === "Requested").length
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeader
          title="Availability requests"
          description={candidates.length ? `${candidates.length} asked · ${available} available · ${waiting} awaiting a reply` : "Ask nearby inspectors with matching skills for their availability."}
          actions={request && <Button variant={p.stage === "Inquiry" ? "default" : "outline"} onClick={request.run}><MailPlus /> {request.label}</Button>}
        />
        <CandidateList candidates={candidates} canEdit={canEdit} locked={p.stage === "Cancelled" || idx >= 3} />
      </section>

      {canPick && (
        <section className="space-y-4">
          <SectionHeader
            title="CVs for the client"
            description={p.pricing ? "Choose the CVs to send. The client price is included in the email." : "The client price must be set by Accounts before CVs can be sent."}
            actions={<Button disabled={sendCvs.disabled} title={sendCvs.hint} onClick={sendCvs.run}><Send /> {sendCvs.label}</Button>}
          />
          <ul className="divide-y rounded-xl border bg-card">
            {unsent.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-4 px-4 py-3.5 hover:bg-primary-light/40">
                  <Checkbox checked={selection.has(c.id)} onCheckedChange={() => { const n = new Set(selection); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); onSelection(n) }} aria-label={`Include ${c.inspector.name}'s CV`} />
                  <UserAvatar name={c.inspector.name} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{c.inspector.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.hasCv ? "CV on file" : "No CV on file"} · {c.inspector.qualifications.join(", ")}</span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">{c.distanceKm} km</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
