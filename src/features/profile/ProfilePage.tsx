import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { DescriptionList } from "@/components/common/DescriptionList"
import { UserAvatar } from "@/components/common/UserAvatar"
import { StatusBadge } from "@/components/common/StatusBadge"
import { MODULE_LABELS, PERMISSIONS, type Module } from "@/constants/permissions"
import { useCurrentUser } from "@/store/session.store"
import { useOrganizations } from "@/features/settings/hooks"

export function ProfilePage() {
  const me = useCurrentUser()
  const orgs = useOrganizations()
  const perms = PERMISSIONS[me.role]
  return (
    <PageContainer>
      <PageHeader title="My profile" description="Your account details and what your role can access." />
      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar name={me.name} className="size-16 text-lg" />
          <DescriptionList className="flex-1" items={[
            { label: "Name", value: me.name }, { label: "Email", value: me.email }, { label: "Role", value: me.role },
            { label: "Organization", value: orgs.data?.find((o) => o.id === me.organizationId)?.name ?? "—" },
            { label: "Sign-in method", value: "One-time password (OTP) to registered email" },
          ]} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Access for {me.role}</CardTitle><CardDescription>What your role can view, create, edit and delete.</CardDescription></CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(MODULE_LABELS) as Module[]).map((m) => {
              const actions = perms[m] ?? []
              return (
                <li key={m} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  <span>{MODULE_LABELS[m]}</span>
                  {actions.length ? <span className="text-xs text-muted-foreground">{actions.join(" · ")}</span> : <StatusBadge status="No access" tone="neutral" dot={false} />}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
