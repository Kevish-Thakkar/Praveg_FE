import { useState } from "react"
import { Cloud, Mail, MapPinned, MessageSquareText, PlugZap, Unplug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/common/StatusBadge"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { Spinner, TableSkeleton } from "@/components/feedback/LoadingState"
import { formatDateTime } from "@/lib/dates"
import type { Integration } from "@/types/domain"
import { useDisconnectIntegration, useIntegrations, useSaveIntegration, useTestIntegration } from "./hooks"

const ICONS = { smtp: Mail, storage: Cloud, otp: MessageSquareText, maps: MapPinned }

/** §6.8 SMTP, §6.9 bucket storage, §4 OTP — mock connection states only (no real integration). */
export function IntegrationsSettings() {
  const q = useIntegrations()
  if (q.isPending) return <Card><TableSkeleton rows={3} columns={2} /></Card>
  if (q.isError) return <Card><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></Card>
  return <div className="grid gap-4 xl:grid-cols-2">{q.data.map((i) => <IntegrationCard key={`${i.id}-${JSON.stringify(i.config)}`} it={i} />)}</div>
}

function IntegrationCard({ it }: { it: Integration }) {
  const canEdit = usePermission("settings", "edit")
  const save = useSaveIntegration()
  const test = useTestIntegration()
  const disconnect = useDisconnectIntegration()
  const [config, setConfig] = useState(it.config)
  const dirty = JSON.stringify(config) !== JSON.stringify(it.config)
  const state = test.isPending ? "Connecting" : it.state
  const Icon = ICONS[it.id]
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary-text"><Icon className="size-4" /></span>
            <div><CardTitle>{it.name}</CardTitle><CardDescription>{it.lastCheckedAt ? `Checked ${formatDateTime(it.lastCheckedAt)}` : "Never checked"}</CardDescription></div>
          </div>
          <StatusBadge status={state} />
        </div>
        <p className="pt-2 text-sm text-muted-foreground">{it.description}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {Object.entries(config).map(([k, v]) => (
          <div key={k} className="space-y-1.5">
            <Label htmlFor={`${it.id}-${k}`} className="capitalize">{k}</Label>
            <Input id={`${it.id}-${k}`} value={v} disabled={!canEdit} onChange={(e) => setConfig((c) => ({ ...c, [k]: e.target.value }))} aria-invalid={!v.trim()} />
          </div>
        ))}
        {state === "Connection Failed" && <p className="text-sm text-danger sm:col-span-2">Connection failed. Check that every field is filled in and try again.</p>}
      </CardContent>
      {canEdit && (
        <CardFooter className="mt-auto flex-wrap justify-end gap-2 border-t pt-4">
          {it.state === "Connected" && <Button variant="ghost" onClick={() => disconnect.mutate(it.id)} disabled={disconnect.isPending}><Unplug /> Disconnect</Button>}
          {dirty && <Button variant="outline" onClick={() => save.mutate({ id: it.id, config })} disabled={save.isPending}>{save.isPending && <Spinner />} Save</Button>}
          <Button onClick={() => test.mutate(it.id)} disabled={test.isPending || dirty}>{test.isPending ? <Spinner /> : <PlugZap />} Test connection</Button>
        </CardFooter>
      )}
    </Card>
  )
}
