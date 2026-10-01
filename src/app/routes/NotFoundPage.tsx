import { Link } from "react-router-dom"
import { Compass } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { PageContainer } from "@/components/layout/PageContainer"

export function NotFoundPage() {
  return (
    <PageContainer>
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you're looking for doesn't exist or the record was removed."
          action={<Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>}
        />
      </div>
    </PageContainer>
  )
}
