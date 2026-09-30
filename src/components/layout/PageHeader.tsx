import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { Breadcrumbs, type Crumb } from "@/components/navigation/Breadcrumbs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  backTo?: { to: string; label: string }
  meta?: ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, backTo, meta, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {backTo && (
            <Button asChild variant="outline" size="icon" className="mt-0.5 shrink-0">
              <Link to={backTo.to} aria-label={`Back to ${backTo.label}`}>
                <ArrowLeft />
              </Link>
            </Button>
          )}
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
            {description && <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>}
            {meta && <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1 text-sm text-muted-foreground">{meta}</div>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
