import { useState } from "react"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatDate } from "@/lib/dates"
import type { VisitRow } from "@/services"
import { useCancelVisit } from "@/features/execution/hooks"
import { CompleteVisitDialog, RescheduleVisitDialog } from "./VisitDialogs"

/**
 * Complete / reschedule / cancel for a visit, shared by the visits table, the visits popover on the job
 * step and the step page. Render `dialogs` once next to whatever triggers the actions.
 */
export function useVisitDialogs() {
  const cancel = useCancelVisit()
  const [completing, setCompleting] = useState<VisitRow | null>(null)
  const [rescheduling, setRescheduling] = useState<VisitRow | null>(null)
  const [cancelling, setCancelling] = useState<VisitRow | null>(null)
  const dialogs = (
    <>
      <CompleteVisitDialog visit={completing} onClose={() => setCompleting(null)} />
      <RescheduleVisitDialog visit={rescheduling} onClose={() => setRescheduling(null)} />
      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this visit?"
        description={`${cancelling?.type} visit on ${formatDate(cancelling?.date)} will be cancelled and its reminder closed. Inform the inspector separately, or reschedule instead to keep the visit.`}
        confirmLabel="Cancel visit"
        destructive
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })}
      />
    </>
  )
  return { complete: setCompleting, reschedule: setRescheduling, cancel: setCancelling, dialogs }
}
