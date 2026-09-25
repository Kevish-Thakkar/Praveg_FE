import { memo } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar"
import { NAV } from "@/constants/navigation"
import { BrandLogo } from "@/components/common/BrandLogo"
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
      <SidebarContent>
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(role, i.module))
          if (!items.length) return null
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                        >
                          <NavLink to={item.to} onClick={() => isMobile && setOpenMobile(false)} className="text-sidebar-foreground">
                            <item.icon className={active ? "text-primary" : "text-muted-foreground"} />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                        {item.to === "/reminders" && dueCount > 0 && (
                          <SidebarMenuBadge className="rounded-full bg-danger-soft px-1.5 text-danger" aria-label={`${dueCount} due`}>
                            {dueCount}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
        <p className="px-2 py-1 text-xs text-muted-foreground">Prototype · mock data · v0.1</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
})
