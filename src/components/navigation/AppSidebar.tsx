import { memo } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar"
import { NAV, NAV_FOOTER, type NavItem } from "@/constants/navigation"
import { BrandLogo } from "@/components/common/BrandLogo"
import { DuotoneIcons } from "@/components/common/DuotoneIcons"
import { can } from "@/constants/permissions"
import { useRole } from "@/store/session.store"
import { useReminders } from "@/features/reminders/hooks"
import { todayISO } from "@/lib/dates"

function useOverdueCount(enabled: boolean) {
  const { data } = useReminders()
  if (!enabled || !data) return 0
  const today = todayISO()
  return data.filter((r) => r.status === "Open" && r.dueDate <= today).length
}

export const AppSidebar = memo(function AppSidebar() {
  const role = useRole()
  const { pathname } = useLocation()
  const { setOpenMobile, isMobile } = useSidebar()
  const dueCount = useOverdueCount(can(role, "reminders"))

  return (
    <DuotoneIcons>
    <Sidebar collapsible="icon" aria-label="Main navigation">
      <SidebarHeader className="h-14 justify-center border-b">
        <div className="flex items-center gap-2.5 px-1 group-data-[collapsible=icon]:px-0">
          <BrandLogo variant="mark" className="size-8 shrink-0" decorative />
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">Praveg</p>
            <p className="truncate text-xs text-muted-foreground">Certification Services</p>
          </div>
          <span className="sr-only">Praveg Certification Services — Operations</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 py-2">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(role, i.module))
          if (!items.length) return null
          return (
            <SidebarGroup key={group.label} className="py-1.5">
              <SidebarGroupLabel className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground/80 uppercase">{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {items.map((item) => <NavEntry key={item.to} item={item} pathname={pathname} badge={item.to === "/reminders" ? dueCount : 0} onNavigate={() => isMobile && setOpenMobile(false)} />)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t py-3">
        <SidebarMenu>
          {NAV_FOOTER.filter((i) => can(role, i.module)).map((item) => <NavEntry key={item.to} item={item} pathname={pathname} onNavigate={() => isMobile && setOpenMobile(false)} />)}
        </SidebarMenu>
        <p className="px-2 pt-1 text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">Prototype · mock data</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
    </DuotoneIcons>
  )
})

function NavEntry({ item, pathname, badge = 0, onNavigate }: { item: NavItem; pathname: string; badge?: number; onNavigate: () => void }) {
  const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.label}
        className="h-10 rounded-md text-[14px] data-[active=true]:bg-primary-light data-[active=true]:font-semibold data-[active=true]:text-primary-dark"
      >
        <NavLink to={item.to} onClick={onNavigate} className="text-sidebar-foreground">
          <item.icon className={active ? "text-primary-dark" : "text-muted-foreground"} />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
      {badge > 0 && (
        <SidebarMenuBadge className="!top-1/2 right-2 h-5 min-w-5 !-translate-y-1/2 rounded bg-danger-soft px-1.5 text-danger" aria-label={`${badge} due`}>
          {badge}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}
