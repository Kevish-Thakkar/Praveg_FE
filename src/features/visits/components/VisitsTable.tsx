import { useMemo, useState, type ReactNode } from "react"
import { CalendarCheck, CalendarX, MapPinned } from "lucide-react"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { EmptyState } from "@/components/common/EmptyState"
import { TextLink } from "@/components/common/TextLink"
import { usePermission } from "@/components/common/Can"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatDate, relativeDay } from "@/lib/dates"
import type { VisitRow } from "@/services"
import { useCancelVisit } from "@/features/execution/hooks"
import { CompleteVisitDialog } from "./VisitDialogs"

export function VisitsTable({ rows, loading, showProject = true, empty }: { rows: VisitRow[]; loading?: boolean; showProject?: boolean; empty?: ReactNode }) {
  const canEdit = usePermission("visits", "edit")
  const cancel = useCancelVisit()
  const [completing, setCompleting] = useState<VisitRow | null>(null)
  const [cancelling, setCancelling] = useState<VisitRow | null>(null)

  const columns = useMemo<Column<VisitRow>[]>(
    () => [
      { id: "date", header: "Date", sortValue: (v) => v.date, cell: (v) => <div><p className="font-medium">{formatDate(v.date)}</p>{v.status === "Upcoming" && <p className="text-xs text-muted-foreground">{relativeDay(v.date)}</p>}</div> },
      { id: "type", header: "Type", sortValue: (v) => v.type, cell: (v) => <StatusBadge status={v.type} tone={v.type === "Repair" ? "warning" : v.type === "Follow-up" ? "violet" : "info"} dot={false} /> },
      ...(showProject ? [{ id: "job", header: "Project", cell: (v: VisitRow) => <div className="max-w-[20rem]"><TextLink to={`/projects/${v.projectId}`}>{v.projectCode}</TextLink><p className="line-clamp-1 text-xs text-muted-foreground">{v.projectTitle}</p></div> }] : []),
      { id: "where", header: "Client · location", hideBelow: "lg", cell: (v) => <div className="text-sm"><p className="line-clamp-1">{v.clientName}</p><p className="text-xs text-muted-foreground">{v.location}</p></div> },
      { id: "inspector", header: "Inspector", hideBelow: "md", sortValue: (v) => v.inspectorName, cell: (v) => v.inspectorName },
      { id: "status", header: "Status", sortValue: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
      {
        id: "actions", header: "", className: "w-12", cell: (v) => (
          <ActionMenu items={[
            { label: "Complete visit", icon: CalendarCheck, hidden: !canEdit || v.status !== "Upcoming", onSelect: () => setCompleting(v) },
            { label: "Cancel visit", icon: CalendarX, destructive: true, hidden: !canEdit || v.status !== "Upcoming", onSelect: () => setCancelling(v) },
          ]} />
        ),
      },
    ],
    [showProject, canEdit],
  )

  return (
    <>
      <DataTable rows={rows} columns={columns} getRowId={(v) => v.id} loading={loading} initialSort={{ id: "date", dir: "asc" }} caption="Visits"
        empty={empty ?? <EmptyState compact icon={MapPinned} title="No visits" description="Job days, follow-up and repair visits appear here." />}
        mobileCard={(v) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2"><p className="font-medium">{formatDate(v.date)} · {v.type}</p><StatusBadge status={v.status} /></div>
            <p className="text-xs text-muted-foreground">{v.projectCode} · {v.clientName}, {v.location}</p>
            <p className="text-xs text-muted-foreground">{v.inspectorName}</p>
          </div>
        )}
      />
      <CompleteVisitDialog visit={completing} onClose={() => setCompleting(null)} />
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} title="Cancel this visit?" description={`${cancelling?.type} visit on ${formatDate(cancelling?.date)} will be cancelled. The inspector should be informed separately.`} confirmLabel="Cancel visit" destructive loading={cancel.isPending} onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })} />
    </>
  )
}
