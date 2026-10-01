import { useMemo, useState, type ReactNode } from "react"
import { CalendarCheck, CalendarX, MapPinned } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/tables/DataTable"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ActionMenu } from "@/components/common/ActionMenu"
import { EmptyState } from "@/components/common/EmptyState"
import { TextLink } from "@/components/common/TextLink"
import { usePermission } from "@/components/common/Can"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { formatDate, relativeDay } from "@/lib/dates"
import { formatMoney } from "@/lib/format"
import type { VisitRow } from "@/services"
import { useCancelVisit } from "@/features/execution/hooks"
import { CompleteVisitDialog } from "./VisitDialogs"
import { VisitDateTile, VisitTypeBadge } from "./VisitBits"

export function VisitsTable({ rows, loading, showProject = true, empty, fill = false }: { rows: VisitRow[]; loading?: boolean; showProject?: boolean; empty?: ReactNode; fill?: boolean }) {
  const canEdit = usePermission("visits", "edit")
  const cancel = useCancelVisit()
  const [completing, setCompleting] = useState<VisitRow | null>(null)
  const [cancelling, setCancelling] = useState<VisitRow | null>(null)

  const columns = useMemo<Column<VisitRow>[]>(
    () => [
      {
        id: "date", header: "Visit", sortValue: (v) => v.date, cell: (v) => (
          <div className="flex items-center gap-3">
            <VisitDateTile date={v.date} muted={v.status === "Cancelled"} />
            <div className="min-w-0 space-y-1">
              <VisitTypeBadge type={v.type} />
              <p className="text-xs text-muted-foreground">{v.status === "Upcoming" ? relativeDay(v.date) : formatDate(v.date)}</p>
            </div>
          </div>
        ),
      },
      ...(showProject ? [{ id: "job", header: "Project", cell: (v: VisitRow) => <div className="max-w-[20rem]"><TextLink to={`/projects/${v.projectId}`}>{v.projectCode}</TextLink><p className="line-clamp-1 text-xs text-muted-foreground">{v.projectTitle}</p></div> }] : []),
      { id: "where", header: "Inspector · site", sortValue: (v) => v.inspectorName, cell: (v) => <div className="text-sm"><p className="line-clamp-1 font-medium">{v.inspectorName}</p><p className="line-clamp-1 text-xs text-muted-foreground">{showProject ? `${v.clientName} · ` : ""}{v.location}</p></div> },
      {
        id: "record", header: "Recorded", hideBelow: "md", cell: (v) => v.status === "Completed" ? (
          <div className="text-sm tabular-nums"><p>{v.unitsSpent ?? 0} {v.unitLabel.toLowerCase()}</p><p className="text-xs text-muted-foreground">{formatMoney(v.expenses ?? 0, v.currency)} expenses</p></div>
        ) : <span className="text-xs text-muted-foreground">—</span>,
      },
      { id: "notes", header: "Notes", hideBelow: "xl", cell: (v) => <p className="line-clamp-2 max-w-[22rem] text-xs text-muted-foreground">{v.notes || "—"}</p> },
      { id: "status", header: "Status", sortValue: (v) => v.status, cell: (v) => <StatusBadge status={v.status} /> },
      {
        id: "actions", header: "", className: "w-px whitespace-nowrap", cell: (v) => canEdit && v.status === "Upcoming" && (
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="outline" onClick={() => setCompleting(v)}><CalendarCheck /> Complete</Button>
            <ActionMenu items={[{ label: "Cancel visit", icon: CalendarX, destructive: true, onSelect: () => setCancelling(v) }]} />
          </div>
        ),
      },
    ],
    [showProject, canEdit],
  )

  return (
    <>
      <DataTable fill={fill} rows={rows} columns={columns} getRowId={(v) => v.id} loading={loading} initialSort={{ id: "date", dir: "asc" }} caption="Visits"
        empty={empty ?? <EmptyState compact icon={MapPinned} title="No visits" description="Job days, follow-up and repair visits appear here." />}
        mobileCard={(v) => (
          <div className="flex gap-3">
            <VisitDateTile date={v.date} muted={v.status === "Cancelled"} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2"><VisitTypeBadge type={v.type} /><StatusBadge status={v.status} /></div>
              <p className="truncate text-sm font-medium">{v.inspectorName}</p>
              <p className="truncate text-xs text-muted-foreground">{v.projectCode} · {v.location}</p>
              {canEdit && v.status === "Upcoming" && <Button size="sm" variant="outline" className="mt-1" onClick={() => setCompleting(v)}><CalendarCheck /> Complete</Button>}
            </div>
          </div>
        )}
      />
      <CompleteVisitDialog visit={completing} onClose={() => setCompleting(null)} />
      <ConfirmDialog open={!!cancelling} onOpenChange={(o) => !o && setCancelling(null)} title="Cancel this visit?" description={`${cancelling?.type} visit on ${formatDate(cancelling?.date)} will be cancelled. The inspector should be informed separately.`} confirmLabel="Cancel visit" destructive loading={cancel.isPending} onConfirm={() => cancelling && cancel.mutate(cancelling.id, { onSuccess: () => setCancelling(null) })} />
    </>
  )
}
