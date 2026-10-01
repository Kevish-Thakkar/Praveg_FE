import { Check, Minus } from "@/components/icons"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SectionHeader } from "@/components/common/SectionHeader"
import { MODULE_LABELS, PERMISSIONS, type Action, type Module } from "@/constants/permissions"
import { ROLES } from "@/types/domain"

const ACTIONS: Action[] = ["view", "create", "edit", "delete"]
const SHORT: Record<Action, string> = { view: "V", create: "C", edit: "E", delete: "D" }

export function RolesSettings() {
  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4"><SectionHeader title="Roles & permissions" description="V = view · C = create · E = edit · D = delete" /></div>
        <div className="overflow-x-auto">
          <Table>
            <caption className="sr-only">Permission matrix by role and module</caption>
            <TableHeader className="bg-primary-dark [&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-[0.04em] [&_th]:text-white [&_th]:uppercase [&_tr]:border-primary-dark [&_tr]:hover:bg-transparent">
              <TableRow>
                <TableHead className="min-w-48">Module</TableHead>
                {ROLES.map((r) => <TableHead key={r} className="text-center">{r}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(MODULE_LABELS) as Module[]).map((m) => (
                <TableRow key={m}>
                  <TableCell className="font-medium">{MODULE_LABELS[m]}</TableCell>
                  {ROLES.map((r) => {
                    const a = PERMISSIONS[r][m] ?? []
                    return (
                      <TableCell key={r} className="text-center">
                        {a.length === 0 ? <Minus className="mx-auto size-4 text-muted-foreground" aria-label="No access" /> : a.length === 4 ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Check className="size-3.5" /> Full</span> : (
                          <span className="font-mono text-xs" aria-label={a.join(", ")}>{ACTIONS.map((x) => (a.includes(x) ? SHORT[x] : "·")).join(" ")}</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
