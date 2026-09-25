import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Building, Coins, KeyRound, LayoutList, Mail, PlugZap, ShieldCheck, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { can } from "@/constants/permissions"
import { useRole } from "@/store/session.store"
import { cn } from "@/lib/utils"

const ITEMS = [
  { to: "organizations", label: "Organizations", icon: Building, group: "Master setup" },
  { to: "currencies", label: "Currencies", icon: Coins, group: "Master setup" },
  { to: "project-types", label: "Services", icon: LayoutList, group: "Master setup" },
  { to: "users", label: "Users", icon: Users, group: "Access" },
  { to: "roles", label: "Roles & permissions", icon: ShieldCheck, group: "Access" },
  { to: "security", label: "Login & security", icon: KeyRound, group: "Access" },
  { to: "email-templates", label: "Email templates", icon: Mail, group: "Communication" },
  { to: "integrations", label: "Integrations", icon: PlugZap, group: "Communication" },
]

export function SettingsLayout() {
  const role = useRole()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const items = ITEMS.filter((i) => i.to !== "users" || can(role, "users"))
  const current = items.find((i) => pathname.includes(`/settings/${i.to}`))
  const groups = [...new Set(items.map((i) => i.group))]
  return (
    <PageContainer>
      <PageHeader title="Settings" description="Master data, users, access, email templates and integrations." breadcrumbs={[{ label: "Settings", to: "/settings" }, ...(current ? [{ label: current.label }] : [])]} />
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <Select value={current?.to} onValueChange={(v) => navigate(`/settings/${v}`)}>
            <SelectTrigger className="w-full bg-card" aria-label="Settings section"><SelectValue /></SelectTrigger>
            <SelectContent>{items.map((i) => <SelectItem key={i.to} value={i.to}>{i.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <nav aria-label="Settings" className="hidden space-y-5 lg:block">
          {groups.map((g) => (
            <div key={g}>
              <p className="mb-1.5 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g}</p>
              <ul className="space-y-0.5">
                {items.filter((i) => i.group === g).map((i) => (
                  <li key={i.to}>
                    <NavLink to={i.to} className={({ isActive }) => cn("flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", isActive && "bg-card font-semibold text-primary-text shadow-xs")}>
                      <i.icon className="size-4 text-muted-foreground" aria-hidden /> {i.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="min-w-0 space-y-4"><Outlet /></div>
      </div>
    </PageContainer>
  )
}
