import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { PageContainer } from "@/components/layout/PageContainer"
import { can, type Action, type Module } from "@/constants/permissions"
import { useRole } from "@/store/session.store"

export function RequirePermission({ module, action = "view", children }: { module: Module; action?: Action; children: ReactNode }) {
  const role = useRole()
  if (can(role, module, action)) return <>{children}</>
  return (
    <PageContainer>
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this page"
          description={`The ${role} role can't ${action} this area. Ask a Super Admin if you need access.`}
          action={<Button asChild><Link to="/dashboard" className="text-primary-foreground">Go to dashboard</Link></Button>}
        />
      </div>
    </PageContainer>
  )
}
