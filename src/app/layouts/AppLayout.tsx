import { Suspense } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/navigation/AppSidebar"
import { GlobalSearch } from "@/components/navigation/GlobalSearch"
import { NotificationsPopover } from "@/components/navigation/NotificationsPopover"
import { UserMenu } from "@/components/navigation/UserMenu"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { PageContainer } from "@/components/layout/PageContainer"
import { useSessionStore } from "@/store/session.store"
import { useDemoStore } from "@/store/demo.store"
import { FlaskConical } from "lucide-react"

export function AppLayout() {
  const user = useSessionStore((s) => s.user)
  const simulateErrors = useDemoStore((s) => s.simulateErrors)
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <SidebarProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-3 backdrop-blur sm:px-4">
          <SidebarTrigger aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="mr-1 !h-5" />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            {simulateErrors && (
              <span className="hidden items-center gap-1 rounded-md bg-danger-soft px-2 py-1 text-xs font-medium text-danger sm:inline-flex">
                <FlaskConical className="size-3.5" /> API errors on
              </span>
            )}
            <NotificationsPopover />
            <UserMenu />
          </div>
        </header>
        <div id="main" className="flex-1" tabIndex={-1}>
          <Suspense fallback={<PageContainer><DetailSkeleton /></PageContainer>}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
