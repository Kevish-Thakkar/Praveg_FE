import { useCallback, useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import type { AppIcon } from "@/components/icons"
import {
  BellRing, CalendarPlus, CheckCheck, CircleCheck, CircleX, FileUp, Mail, MailPlus, MapPinPlus, Pencil, ReceiptText,
  Send, Tag, UserCheck, UsersRound, BadgeCheck, MessageSquareWarning,
} from "@/components/icons"
import { usePermission } from "@/components/common/Can"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { PresetComposer } from "@/features/emails/components/PresetComposer"
import { useSendEmail } from "@/features/emails/hooks"
import { ScheduleVisitDialog } from "@/features/visits/components/VisitDialogs"
import { PoDialog } from "@/features/purchase-orders/components/PoDialog"
import { newPoFor } from "@/features/purchase-orders/po-utils"
import { useBillingActions } from "@/features/finance/components/BillingActions"
import type { CheckpointActionKey } from "@/lib/project-workflow"
import { pendingChangeRequest } from "@/lib/workflow"
import { ClientCommentDialog, type ClientCommentMode } from "../workflow/ClientCommentDialog"
import type { PORow, ProjectRow } from "@/services"
import { PricingPanel } from "../workflow/PricingPanel"
import { RequestInspectorsDialog } from "../workflow/AvailabilityStep"
import { CancelDialog, DecisionDialog, ReportDialog, ScheduleDialog } from "../workflow/Dialogs"
import type { CandidateRow } from "../workflow/types"
import {
  useAssignInspector, useDeleteProject, useMarkJobDone, useRecordInterview, useRequestPricing, useSendCompletion, useSendCvs, useSendJobReminder,
} from "../../hooks"

type Dialog = "request" | "decision" | "schedule" | "report" | "cvs" | "completion" | "documents" | "cancel" | "delete" | "price" | "visit" | "po" | null

export interface ResolvedAction {
  key: CheckpointActionKey
  label: string
  icon: AppIcon
  run: () => void
  pending?: boolean
  disabled?: boolean
  hint?: string
}

const META: Record<CheckpointActionKey, { label: string; icon: AppIcon }> = {
  editProject: { label: "Edit details", icon: Pencil },
  requestAvailability: { label: "Request availability", icon: MailPlus },
  recordReplies: { label: "Record replies", icon: UsersRound },
  requestPrice: { label: "Request client price", icon: Tag },
  setPrice: { label: "Set client price", icon: Tag },
  sendCvs: { label: "Send CVs to client", icon: Send },
  recordDecision: { label: "Record client decision", icon: UserCheck },
  interviewPassed: { label: "Interview passed", icon: CircleCheck },
  interviewFailed: { label: "Not selected", icon: CircleX },
  assignInspector: { label: "Assign & send confirmation", icon: UserCheck },
  scheduleJob: { label: "Schedule job", icon: CalendarPlus },
  sendReminder: { label: "Send reminder now", icon: BellRing },
  markJobDone: { label: "Mark job done", icon: CheckCheck },
  scheduleVisit: { label: "Schedule visit", icon: MapPinPlus },
  recordPO: { label: "Record PO", icon: ReceiptText },
  uploadReport: { label: "Upload report", icon: FileUp },
  sendCompletion: { label: "Send report to client", icon: Mail },
  completeJob: { label: "Complete job", icon: CircleCheck },
  requestChanges: { label: "Changes requested", icon: MessageSquareWarning },
  sendDocuments: { label: "Send documents to client", icon: Send },
  uploadInvoice: { label: "Upload invoice", icon: FileUp },
  sendPaymentReminder: { label: "Send payment reminder", icon: BellRing },
  sendPaymentFollowUp: { label: "Send follow-up", icon: MessageSquareWarning },
  confirmPayment: { label: "Confirm payment", icon: BadgeCheck },
}

/**
 * All project actions in one place. Checkpoints only say *which* actions fit their state;
 * this hook decides whether the current role may run them and opens the existing dialogs.
 */
export function useProjectActions({ p, candidates, pos, onGoTo }: { p: ProjectRow; candidates: CandidateRow[]; pos: PORow[]; onGoTo: (tab: string) => void }) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [cvSelection, setCvSelection] = useState<Set<string> | null>(null)
  const canEditRole = usePermission("projects", "edit")
  const canEdit = canEditRole && !p.locked
  const canDelete = usePermission("projects", "delete")
  const canPrice = usePermission("pricing", "edit")
  const canCandidates = usePermission("candidates", "edit") && !p.locked
  const canVisit = usePermission("visits", "create") && !p.locked
  const canPO = usePermission("purchaseOrders", "edit")
  const canSendDocs = usePermission("outDocuments", "create")
  const canBill = usePermission("billing", "edit")
  const cancelled = p.stage === "Cancelled"

  const assign = useAssignInspector()
  const interview = useRecordInterview()
  const reminder = useSendJobReminder()
  const jobDone = useMarkJobDone()
  const sendCvs = useSendCvs()
  const completion = useSendCompletion()
  const sendEmail = useSendEmail()
  const del = useDeleteProject()
  const requestPrice = useRequestPricing()
  const billing = useBillingActions()

  const available = useMemo(() => candidates.filter((c) => c.availability === "Available"), [candidates])
  const unsent = useMemo(() => available.filter((c) => !c.cvSentAt), [available])
  const selectedCvs = cvSelection ?? new Set(unsent.map((c) => c.id))
  const po = pos[0] ?? null
  const [poEditing, setPoEditing] = useState<PORow | null>(null)
  const [comment, setComment] = useState<ClientCommentMode | null>(null)
  const changesPending = !!pendingChangeRequest(p.completion)

  const resolve = useCallback((key: CheckpointActionKey): ResolvedAction | null => {
    if (cancelled) return null
    const m = META[key]
    const a = (run: () => void, extra: Partial<ResolvedAction> = {}): ResolvedAction => ({ key, label: m.label, icon: m.icon, run, ...extra })
    switch (key) {
      case "editProject": return canEdit ? a(() => navigate(`/projects/${p.id}/edit`)) : null
      case "requestAvailability": return canEdit && ["Inquiry", "Inspector Assigned", "CVs Sent"].includes(p.stage) ? a(() => setDialog("request"), p.stage !== "Inquiry" ? { label: "Request more inspectors" } : {}) : null
      case "recordReplies": return canCandidates ? a(() => onGoTo("inspectors")) : null
      case "requestPrice": return canEdit && !canPrice && !p.pricing ? a(() => requestPrice.mutate(p.id), { label: p.pricingRequestedAt ? "Remind Accounts" : "Request client price", pending: requestPrice.isPending }) : null
      case "setPrice": return canPrice ? a(() => setDialog("price"), p.pricing ? { label: "Edit client price" } : {}) : null
      case "sendCvs": return canEdit ? a(() => setDialog("cvs"), { label: `Send ${selectedCvs.size || ""} CV${selectedCvs.size === 1 ? "" : "s"} to client`, disabled: !p.pricing || !selectedCvs.size, hint: !p.pricing ? "Set the client price first" : undefined }) : null
      case "recordDecision": return canEdit ? a(() => setDialog("decision")) : null
      case "interviewPassed": return canEdit ? a(() => interview.mutate({ projectId: p.id, result: "Passed" }), { pending: interview.isPending }) : null
      case "interviewFailed": return canEdit ? a(() => interview.mutate({ projectId: p.id, result: "Failed" }), { pending: interview.isPending }) : null
      case "assignInspector": return canEdit ? a(() => assign.mutate(p.id), { pending: assign.isPending }) : null
      case "scheduleJob": return canEdit ? a(() => setDialog("schedule"), p.schedule ? { label: "Change job dates" } : {}) : null
      case "sendReminder": return canEdit ? a(() => reminder.mutate(p.id), { pending: reminder.isPending }) : null
      case "markJobDone": return canEdit ? a(() => jobDone.mutate(p.id), { pending: jobDone.isPending }) : null
      case "scheduleVisit": return canVisit && p.assignedInspectorId ? a(() => setDialog("visit")) : null
      // no PO record yet → create one now (the client's PO can arrive before the inspector is assigned)
      case "recordPO": return canPO ? a(() => setPoEditing(po ?? newPoFor(p)), po ? (po.poNumber ? { label: "Update PO" } : {}) : { label: "Create PO" }) : null
      case "uploadReport": return canEdit ? a(() => setDialog("report"), changesPending ? { label: "Upload revised report" } : p.completion.reportUploadedAt ? { label: "Add report files" } : {}) : null
      case "sendCompletion": return canEdit ? a(() => setDialog("completion"), changesPending ? { label: "Send revised report" } : {}) : null
      case "completeJob": return canEdit ? a(() => setComment("complete"), p.clientReplies ? { label: "Review comment & complete" } : { label: "Record comment & complete" }) : null
      case "requestChanges": return canEdit ? a(() => setComment("changes")) : null
      case "sendDocuments": return canSendDocs && !p.locked ? a(() => setDialog("documents")) : null
      case "uploadInvoice": return canBill ? a(() => billing.run(p, "uploadInvoice")) : null
      case "sendPaymentReminder": return canBill ? a(() => billing.run(p, "remind")) : null
      case "sendPaymentFollowUp": return canBill ? a(() => billing.run(p, "followUp")) : null
      case "confirmPayment": return canBill ? a(() => billing.run(p, "confirmPayment")) : null
    }
  }, [cancelled, canEdit, canCandidates, canPrice, canVisit, canPO, canSendDocs, canBill, p, po, navigate, onGoTo, requestPrice, interview, assign, reminder, jobDone, billing, selectedCvs.size, changesPending])

  const resolveAll = useCallback((keys: CheckpointActionKey[]) => keys.map(resolve).filter(Boolean) as ResolvedAction[], [resolve])

  const dialogs: ReactNode = (
    <>
      <RequestInspectorsDialog p={p} open={dialog === "request"} onOpenChange={(o) => setDialog(o ? "request" : null)} />
      <DecisionDialog p={p} candidates={candidates} open={dialog === "decision"} onOpenChange={(o) => setDialog(o ? "decision" : null)} />
      <ScheduleDialog p={p} open={dialog === "schedule"} onOpenChange={(o) => setDialog(o ? "schedule" : null)} />
      <ReportDialog p={p} open={dialog === "report"} onOpenChange={(o) => setDialog(o ? "report" : null)} />
      <CancelDialog p={p} open={dialog === "cancel"} onOpenChange={(o) => setDialog(o ? "cancel" : null)} />
      {dialog === "price" && <PricingPanel p={p} inspectors={available.map((c) => c.inspector)} dialogOnly open onOpenChange={(o) => !o && setDialog(null)} />}
      {p.assignedInspectorId && <ScheduleVisitDialog project={p} open={dialog === "visit"} onOpenChange={(o) => setDialog(o ? "visit" : null)} />}
      <PoDialog po={poEditing} onClose={() => setPoEditing(null)} />
      <PresetComposer
        open={dialog === "cvs"} onOpenChange={(o) => setDialog(o ? "cvs" : null)} projectId={p.id} kind="CVs to Client" candidateIds={[...selectedCvs]}
        title="Send CVs & price to client" description="CVs of the selected inspectors are attached. The client's main email and contacts are pre-filled."
        sendLabel="Send to client" sending={sendCvs.isPending}
        onSend={(email) => sendCvs.mutate({ projectId: p.id, candidateIds: [...selectedCvs], email }, { onSuccess: () => { setDialog(null); setCvSelection(null) } })}
      />
      <PresetComposer
        open={dialog === "completion"} onOpenChange={(o) => setDialog(o ? "completion" : null)} projectId={p.id} kind="Completion"
        title={changesPending ? "Send revised report to client" : "Send report to client"}
        description="The report and documents are attached. The job is completed once the client's comment on the report is recorded."
        sendLabel="Send to client" sending={completion.isPending}
        onSend={(email) => completion.mutate({ projectId: p.id, email }, { onSuccess: () => setDialog(null) })}
      />
      {comment && <ClientCommentDialog p={p} mode={comment} onClose={() => setComment(null)} />}
      <PresetComposer
        open={dialog === "documents"} onOpenChange={(o) => setDialog(o ? "documents" : null)} projectId={p.id} kind="General"
        title="Send documents to client" description={`${p.code} · ${p.clientName}`}
        sending={sendEmail.isPending} onSend={(email) => sendEmail.mutate(email, { onSuccess: () => setDialog(null) })}
      />
      <ConfirmDialog open={dialog === "delete"} onOpenChange={(o) => setDialog(o ? "delete" : null)} title={`Delete ${p.code}?`} description="Only inquiries can be deleted. Later stages must be cancelled instead." confirmLabel="Delete inquiry" destructive loading={del.isPending} onConfirm={() => del.mutate(p.id, { onSuccess: () => navigate("/projects") })} />
      {billing.dialogs}
    </>
  )

  return {
    resolve, resolveAll, dialogs,
    openCancel: () => setDialog("cancel"),
    openDelete: () => setDialog("delete"),
    canCancel: canEdit && !cancelled && p.stage !== "Completed",
    canDelete: canDelete && p.stage === "Inquiry",
    cvSelection: selectedCvs,
    setCvSelection,
    billingReady: billing.ready,
  }
}
