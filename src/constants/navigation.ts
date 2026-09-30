import type { LucideIcon } from "lucide-react"
import {
  Bell, BriefcaseBusiness, Building2, CalendarDays, Clock3, FileBarChart, FolderOpen, HardHat, LayoutDashboard, Mail, Settings, Truck, Wallet,
} from "lucide-react"
import type { Module } from "./permissions"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  module: Module
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/**
 * Global navigation — only cross-project concepts. Anything that belongs to one job (inspector requests & CVs,
 * visits, purchase orders, out documents) lives in the project workspace tabs instead. Emails are in both:
 * the global log here (all mails sent) and the project's Emails tab.
 * Those routes still exist (old links keep working) but are not listed here.
 */
export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Projects", to: "/projects", icon: BriefcaseBusiness, module: "projects" },
      { label: "Calendar", to: "/calendar", icon: CalendarDays, module: "calendar" },
      { label: "Reminders", to: "/reminders", icon: Bell, module: "reminders" },
      { label: "Emails", to: "/emails", icon: Mail, module: "emails" },
    ],
  },
  {
    label: "Directory",
    items: [
      { label: "Clients", to: "/clients", icon: Building2, module: "clients" },
      { label: "Vendors", to: "/vendors", icon: Truck, module: "vendors" },
      { label: "Inspectors", to: "/inspectors", icon: HardHat, module: "inspectors" },
      { label: "Document library", to: "/documents", icon: FolderOpen, module: "documents" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { label: "Invoicing & payments", to: "/finance", icon: Wallet, module: "billing" },
      { label: "Operations & time", to: "/operations", icon: Clock3, module: "operations" },
      { label: "Reports", to: "/reports", icon: FileBarChart, module: "reports" },
    ],
  },
]

/** Pinned to the bottom of the sidebar */
export const NAV_FOOTER: NavItem[] = [{ label: "Settings", to: "/settings", icon: Settings, module: "settings" }]
