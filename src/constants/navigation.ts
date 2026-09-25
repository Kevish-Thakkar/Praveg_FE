import type { LucideIcon } from "lucide-react"
import {
  Bell, BriefcaseBusiness, Building2, CalendarDays, Clock3, FileBarChart, FileCheck2, FileText, FolderOpen,
  HardHat, LayoutDashboard, Mail, MapPinned, ReceiptText, Settings, Truck, Wallet,
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

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Calendar", to: "/calendar", icon: CalendarDays, module: "calendar" },
      { label: "Reminders", to: "/reminders", icon: Bell, module: "reminders" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Projects", to: "/projects", icon: BriefcaseBusiness, module: "projects" },
      { label: "Inspector requests & CVs", to: "/requests", icon: FileText, module: "candidates" },
      { label: "Purchase Orders", to: "/purchase-orders", icon: ReceiptText, module: "purchaseOrders" },
      { label: "Visits", to: "/visits", icon: MapPinned, module: "visits" },
      { label: "Out Documents", to: "/out-documents", icon: FileCheck2, module: "outDocuments" },
      { label: "Documents", to: "/documents", icon: FolderOpen, module: "documents" },
      { label: "Emails", to: "/emails", icon: Mail, module: "emails" },
    ],
  },
  {
    label: "Master data",
    items: [
      { label: "Clients", to: "/clients", icon: Building2, module: "clients" },
      { label: "Vendors", to: "/vendors", icon: Truck, module: "vendors" },
      { label: "Inspectors", to: "/inspectors", icon: HardHat, module: "inspectors" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { label: "Invoicing & Payments", to: "/finance", icon: Wallet, module: "billing" },
      { label: "Operations & Time", to: "/operations", icon: Clock3, module: "operations" },
      { label: "Reports", to: "/reports", icon: FileBarChart, module: "reports" },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", to: "/settings", icon: Settings, module: "settings" }],
  },
]
