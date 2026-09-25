import { lazy, Suspense, type ComponentType, type ReactNode } from "react"
import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "@/app/layouts/AppLayout"
import { RequirePermission } from "./RequirePermission"
import { NotFoundPage } from "./NotFoundPage"
import type { Action, Module } from "@/constants/permissions"

/** Route-level code splitting: each feature page is its own chunk. */
function page<T extends Record<string, ComponentType>>(loader: () => Promise<T>, name: keyof T) {
  return lazy(() => loader().then((m) => ({ default: m[name] as ComponentType })))
}

const LoginPage = page(() => import("@/features/auth/LoginPage"), "LoginPage")
const DashboardPage = page(() => import("@/features/dashboard/DashboardPage"), "DashboardPage")
const ProjectsPage = page(() => import("@/features/projects/ProjectsPage"), "ProjectsPage")
const ProjectFormPage = page(() => import("@/features/projects/ProjectFormPage"), "ProjectFormPage")
const ProjectDetailPage = page(() => import("@/features/projects/ProjectDetailPage"), "ProjectDetailPage")
const RequestsPage = page(() => import("@/features/requests/RequestsPage"), "RequestsPage")
const PurchaseOrdersPage = page(() => import("@/features/purchase-orders/PurchaseOrdersPage"), "PurchaseOrdersPage")
const VisitsPage = page(() => import("@/features/visits/VisitsPage"), "VisitsPage")
const CalendarPage = page(() => import("@/features/calendar/CalendarPage"), "CalendarPage")
const RemindersPage = page(() => import("@/features/reminders/RemindersPage"), "RemindersPage")
const NotificationsPage = page(() => import("@/features/notifications/NotificationsPage"), "NotificationsPage")
const DocumentsPage = page(() => import("@/features/documents/DocumentsPage"), "DocumentsPage")
const OutDocumentsPage = page(() => import("@/features/out-documents/OutDocumentsPage"), "OutDocumentsPage")
const EmailsPage = page(() => import("@/features/emails/EmailsPage"), "EmailsPage")
const ClientsPage = page(() => import("@/features/clients/ClientsPage"), "ClientsPage")
const ClientDetailPage = page(() => import("@/features/clients/ClientDetailPage"), "ClientDetailPage")
const VendorsPage = page(() => import("@/features/vendors/VendorsPage"), "VendorsPage")
const InspectorsPage = page(() => import("@/features/inspectors/InspectorsPage"), "InspectorsPage")
const InspectorFormPage = page(() => import("@/features/inspectors/InspectorFormPage"), "InspectorFormPage")
const InspectorDetailPage = page(() => import("@/features/inspectors/InspectorDetailPage"), "InspectorDetailPage")
const FinancePage = page(() => import("@/features/finance/FinancePage"), "FinancePage")
const OperationsPage = page(() => import("@/features/operations/OperationsPage"), "OperationsPage")
const ReportsPage = page(() => import("@/features/reports/ReportsPage"), "ReportsPage")
const SettingsLayout = page(() => import("@/features/settings/SettingsLayout"), "SettingsLayout")
const OrganizationsSettings = page(() => import("@/features/settings/OrganizationsSettings"), "OrganizationsSettings")
const CurrenciesSettings = page(() => import("@/features/settings/CurrenciesSettings"), "CurrenciesSettings")
const ProjectTypesSettings = page(() => import("@/features/settings/ProjectTypesSettings"), "ProjectTypesSettings")
const UsersSettings = page(() => import("@/features/settings/UsersSettings"), "UsersSettings")
const RolesSettings = page(() => import("@/features/settings/RolesSettings"), "RolesSettings")
const TemplatesSettings = page(() => import("@/features/settings/TemplatesSettings"), "TemplatesSettings")
const IntegrationsSettings = page(() => import("@/features/settings/IntegrationsSettings"), "IntegrationsSettings")
const SecuritySettings = page(() => import("@/features/settings/SecuritySettings"), "SecuritySettings")
const ProfilePage = page(() => import("@/features/profile/ProfilePage"), "ProfilePage")

const guard = (module: Module, el: ReactNode, action: Action = "view") => <RequirePermission module={module} action={action}>{el}</RequirePermission>

export const router = createBrowserRouter([
  { path: "/login", element: <Suspense fallback={null}><LoginPage /></Suspense> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: guard("dashboard", <DashboardPage />) },
      {
        path: "projects",
        children: [
          { index: true, element: guard("projects", <ProjectsPage />) },
          { path: "new", element: guard("projects", <ProjectFormPage />, "create") },
          { path: ":projectId", element: guard("projects", <ProjectDetailPage />) },
          { path: ":projectId/edit", element: guard("projects", <ProjectFormPage />, "edit") },
        ],
      },
      { path: "requests", element: guard("candidates", <RequestsPage />) },
      { path: "quotations", element: <Navigate to="/requests" replace /> },
      { path: "inspections/*", element: <Navigate to="/projects" replace /> },
      { path: "purchase-orders", element: guard("purchaseOrders", <PurchaseOrdersPage />) },
      { path: "visits", element: guard("visits", <VisitsPage />) },
      { path: "calendar", element: guard("calendar", <CalendarPage />) },
      { path: "reminders", element: guard("reminders", <RemindersPage />) },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "documents", element: guard("documents", <DocumentsPage />) },
      { path: "out-documents", element: guard("outDocuments", <OutDocumentsPage />) },
      { path: "emails", element: guard("emails", <EmailsPage />) },
      {
        path: "clients",
        children: [
          { index: true, element: guard("clients", <ClientsPage />) },
          { path: ":clientId", element: guard("clients", <ClientDetailPage />) },
        ],
      },
      { path: "vendors", element: guard("vendors", <VendorsPage />) },
      {
        path: "inspectors",
        children: [
          { index: true, element: guard("inspectors", <InspectorsPage />) },
          { path: "new", element: guard("inspectors", <InspectorFormPage />, "create") },
          { path: ":inspectorId", element: guard("inspectors", <InspectorDetailPage />) },
          { path: ":inspectorId/edit", element: guard("inspectors", <InspectorFormPage />, "edit") },
        ],
      },
      { path: "finance", element: guard("billing", <FinancePage />) },
      { path: "operations", element: guard("operations", <OperationsPage />) },
      { path: "reports", element: guard("reports", <ReportsPage />) },
      {
        path: "settings",
        element: guard("settings", <SettingsLayout />),
        children: [
          { index: true, element: <Navigate to="organizations" replace /> },
          { path: "organizations", element: <OrganizationsSettings /> },
          { path: "currencies", element: <CurrenciesSettings /> },
          { path: "project-types", element: <ProjectTypesSettings /> },
          { path: "services", element: <ProjectTypesSettings /> },
          { path: "users", element: guard("users", <UsersSettings />) },
          { path: "roles", element: <RolesSettings /> },
          { path: "email-templates", element: <TemplatesSettings /> },
          { path: "integrations", element: <IntegrationsSettings /> },
          { path: "security", element: <SecuritySettings /> },
        ],
      },
      { path: "profile", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
])
