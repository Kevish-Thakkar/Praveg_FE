# Praveg Certification Services — Operations Management Platform (Frontend Wireframe, v2)

An interactive prototype of the **Inspection & Testing Management Platform** described in
*Proposal: Operations Management Platform for Praveg* (Shaligram Infotech, 31 Aug 2026), reworked (v2)
around the client's feedback: **one project = one job**, a six-stage job flow, nearby-inspector search,
three roles, and an Accounts workspace for pricing, invoices and payment follow-up.

Operations cover **India and the UAE** (currencies INR and AED). Branding uses the Praveg logo in
`src/assets/brand/` (cropped from the supplied `public/Photo.png`); the login and dashboard gradients are
taken from the logo's blues.

There is **no backend**. All data is realistic sample data held in an in-browser mock database,
behind a service layer built to be swapped for REST APIs later.

> Related docs: [CONFIRMATIONS_NEEDED.md](./CONFIRMATIONS_NEEDED.md) · [ASSUMPTIONS.md](./ASSUMPTIONS.md) · [FLOW.md](./FLOW.md) · [COMPONENTS.md](./COMPONENTS.md)

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check (tsc -b) + production build to dist/
npm run preview    # serve the production build
npm run typecheck  # TypeScript only
npm run lint       # oxlint
```

Requires Node 20+ (built and verified on Node 22).

> **Upgrading from v1 on the same browser:** v2 uses a new mock-DB key (`praveg-ops-mockdb-v4`), so
> sample data loads fresh. If you see stale data, use **Reset demo data** in the account menu.

### Signing in

The login screen simulates **OTP login**. Pick one of the demo accounts, or type an email.
The OTP for every account is **`246810`**.

| Role | Demo user | What they do |
|---|---|---|
| Super Admin | Rajesh Nair | Everything: settings, users, pricing, invoicing, all projects |
| Coordinator | Priya Desai | Master data (clients, vendors, inspectors) and the job workflow. Sees the client price, can't set it |
| Accountant | Meera Shah | Sets the client price per job, uploads invoices, follows up and confirms payments; read-only on operations |

The **account menu** (top right) has prototype controls: switch role, simulate API errors, reset demo data.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | Vite 8, React 19, TypeScript (strict) | As specified |
| Styling | Tailwind CSS v4, design tokens in `src/index.css` | CSS-variable tokens, no ad-hoc colours |
| Components | shadcn/ui (new-york v4, Radix primitives), Lucide icons | Copied into `src/components/ui` |
| Routing | React Router 7 (data router, lazy routes) | One chunk per page |
| Server state | TanStack Query 5 | Loading, error and retry states, cache invalidation; maps directly to a REST API later |
| Global state | Zustand (session and demo controls only) | Kept deliberately small |
| Forms | React Hook Form + Zod 4 | Validation, required markers, error messages |
| Charts | Recharts through the shadcn `chart` wrapper | Dashboard only (lazy chunk) |
| Dates | date-fns | |

**Note on shadcn/ui:** the shadcn CLI registry (`ui.shadcn.com`) was blocked from the build environment,
so the component sources were taken from the shadcn GitHub repository (`apps/v4/registry/new-york-v4/ui`)
and their imports rewritten. They behave exactly like CLI-installed components. `components.json` is
absent, so running `npx shadcn add …` later needs `npx shadcn init` first (choose the new-york style and
keep the existing `src/components/ui`).

---

## Architecture

```
Component ──► feature hook (TanStack Query) ──► service ──► request() ──► mock DB
                                                   └─ later: fetch('/api/…')
```

- **`src/services/*.service.ts`**: the only code that touches data. Each call goes through
  `request()` in `services/api.ts`, which adds simulated latency, error simulation and a deep copy, so
  the UI can never mutate the mock DB by accident. Services also enforce the business rules (e.g. CVs
  can't be sent before Accounts sets the client price, only confirmed-available inspectors can be sent,
  the interview must pass before assignment, the report must be uploaded before the completion email).
  To move to a real backend, replace each service body with a `fetch` call. Hooks and components stay as they are.
- **`src/features/*/hooks.ts`**: query and mutation hooks. `useAppMutation` (`lib/query.ts`)
  standardises success and error toasts and cache invalidation. Workflow steps invalidate `WORKFLOW_KEYS`,
  because one step changes several derived views (project stage, dashboard, POs, billing).
- **View models**: services return enriched rows (`ProjectRow`, `BillingRow`, `VendorRow` …), so
  components never join collections themselves.
- **Insight, not stored**: `lib/workflow.ts → describeProject()` works out, for every job, the current
  checkpoint, sub-steps, the **next action and who owns it**, the next date and a due-date tone. The grid,
  dashboard and project page all read from it, so they always agree.
- **Automatic emails**: `services/scheduler.ts` simulates a job queue. The job reminder (09:00 the day
  before the first job date) and the report request (09:00 the day after the job) are stored as
  `Scheduled` emails and flip to `Sent` on the first API call after their time.
- **Location**: `constants/geo.ts` has a mock geocoder (city centres for the main industrial cities of
  India and the UAE) and a haversine distance. Nearby = within 100 km of the job site; the map preview is a
  keyless Google Maps embed.

### Folder structure

```
src/
├── app/
│   ├── layouts/AppLayout.tsx        # sidebar + header shell, auth guard
│   ├── providers/AppProviders.tsx   # QueryClient, Tooltip, Toaster
│   └── routes/                      # router (lazy pages), RequirePermission, 404
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── common/                      # KpiTile, StageTrack, StatusBadge, EmptyState, ActionMenu, BrandLogo, …
│   ├── layout/                      # PageContainer, PageHeader
│   ├── navigation/                  # AppSidebar, GlobalSearch (Ctrl+K), NotificationsPopover, UserMenu, Breadcrumbs
│   ├── forms/                       # RHF fields (incl. creatable multi-select), address.tsx (address + map), FileDropzone
│   ├── tables/DataTable.tsx         # sort, paginate, select, mobile cards
│   ├── dialogs/                     # ConfirmDialog, FormDialog, DetailDrawer
│   └── feedback/                    # LoadingState (skeletons), ErrorState, QueryState
├── features/                        # one folder per module: pages, components/, hooks.ts
│   ├── auth · dashboard · projects (+ components/workflow) · requests · purchase-orders · visits · execution
│   ├── calendar · reminders · notifications · documents · out-documents · emails
│   ├── clients · vendors · inspectors · finance (Invoicing & Payments) · operations · reports · settings · profile
├── services/                        # mock API layer (one file per domain)
├── mock/
│   ├── db.ts                        # in-memory DB + localStorage persistence + reset
│   └── seed/                        # masters.ts, operations.ts, communication.ts
├── store/                           # Zustand: session.store.ts, demo.store.ts
├── constants/                       # permissions (3 roles), navigation, status → tone, geo (countries, states, cities, distance)
├── lib/                             # dates, format, workflow insight, email merge, query client
├── hooks/                           # use-mobile, use-tab-param
└── types/domain.ts                  # the whole domain model
```

### Routing

| Path | Page |
|---|---|
| `/login` | OTP sign-in (brand gradient) |
| `/dashboard` | Role-based dashboard (in-flight KPIs only) |
| `/projects?stage=` | Project board: stage track, checkpoint, next action, due date per row |
| `/projects/new`, `/projects/:id/edit` | Inquiry form with nearby-inspector search |
| `/projects/:id?tab=workflow\|documents\|emails\|activity&action=` | Job workflow hub (six steps). `action=` opens the matching step/dialog |
| `/requests` | Inspector requests & CVs across projects (`/quotations` redirects here) |
| `/purchase-orders` | PO register (record client PO) |
| `/visits` · `/calendar` · `/reminders` · `/notifications` | Scheduling & follow-up |
| `/out-documents?project=` | Reports & documents for jobs that are done; completion email |
| `/documents` · `/emails` | Central repository & email log (incl. scheduled automatic emails) |
| `/clients`, `/clients/:id` · `/vendors` · `/inspectors`, `/inspectors/new`, `/inspectors/:id`, `/inspectors/:id/edit` | Master data |
| `/finance?tab=pricing\|invoice\|payments\|paid&project=` | Invoicing & payments (Accounts) |
| `/operations` · `/reports` | Diagram-only modules (open questions in CONFIRMATIONS_NEEDED.md) |
| `/settings/{organizations,currencies,project-types,users,roles,security,email-templates,integrations}` | Configuration (`project-types` is labelled **Services**) |
| `/profile` | Own account & effective permissions |

Every route is guarded by `RequirePermission`, which shows an in-app "no access" page. Navigation items the
role can't view are hidden. Tabs live in the URL, so they can be deep-linked and survive back/forward.

### State management

| Kind | Where |
|---|---|
| Server state (all entity data) | TanStack Query cache ← services |
| Global app state | Zustand: `session.store` (signed-in user, persisted), `demo.store` (error simulation) |
| Form state | React Hook Form, per form |
| UI state (dialogs, filters, selection) | Local `useState` in the component that owns it |

### Performance

- Route-level code splitting (`React.lazy`). Recharts (via `ui/chart.tsx`) is only loaded with the dashboard.
- `DataTable` rows are `React.memo` and receive stable props (memoised `columns`, `useCallback` toggles).
  Pagination keeps DOM size small. With the dataset sizes in the proposal, virtualization isn't needed.
- `useMemo` is used only for filtering and aggregating lists. Option lists for forms are memoised once in `useLookupOptions`.
- `useWatch` (not `form.watch`) is used for field-level subscriptions.
- The entry chunk is ~190 kB gzipped. The warning limit is raised to 700 kB in `vite.config.ts`.

### Design decisions

- **Colours**: primary `#07A3E7`, background `#F3F5F7`, all defined as tokens in `src/index.css`.
  `#07A3E7` on white has a contrast of 2.8:1, which fails WCAG AA for text. It is therefore used for fills,
  active states, focus rings and icons, while text links use the darker `--primary-text` (`#0473A6`, 5.2:1).
  White text on primary buttons is a known exception; see ASSUMPTIONS A-14.
- Status colours come from one map (`constants/status.ts`) and always appear with a text label.
- **No "to be confirmed" banners in the UI.** Open questions that used to appear on screens are listed in
  [CONFIRMATIONS_NEEDED.md](./CONFIRMATIONS_NEEDED.md), so the screens read as a finished product.
- **Income KPIs** (Accountant & Super Admin dashboards, Invoicing & payments): received this month,
  outstanding, due in 7 days, overdue and to-invoice — each tile shows **INR (India) and AED (UAE)
  separately**, never added together, with the item count beside the icon.
- **Graphs** share one **country filter (India · INR / UAE · AED)** above them (`?country=IN|AE`):
  open projects by stage, open projects by service, invoiced vs received (last 6 months), outstanding by
  client. Colours were checked with a colour-blind-safety validator; every bar is labelled or has a tooltip.
- The project field is called **Project name** everywhere (no "Job title").
- **Accountant project board**: same stage track, checkpoint and next action as the Coordinator, plus the
  project description, client contact person, amount (client price or invoice total) and payment due date.
- **Fewer actions, more information** in the grid: each row has one next-action button (owner shown
  underneath — Coordinator, Accounts, or "waiting on client/inspector"), a six-dot stage track with
  tooltips, the checkpoint text and a colour-coded due chip.
- The project page shows the six steps as cards: done steps collapse to a one-line summary, the current
  step is expanded with its actions, later steps are locked.
- KPI tiles use tinted gradients with a large faded icon as illustration. Completed counts were removed
  from the dashboards as requested; only work in flight is counted.

---

## Verification performed (v2)

- `tsc -b` in strict mode: 0 errors. `vite build`: succeeds. `oxlint`: 0 errors (advisory warnings only:
  fast-refresh "only export components" notices and a few "setState in effect" notices for dialogs that
  reset their state when opened).
- Automated Playwright crawl of **55 routes × 3 roles**: no console errors. Access denials match the
  permission matrix; unknown routes show the 404 page.
- Automated **end-to-end job flow**: Coordinator creates an inquiry (site auto-filled from the client,
  nearby inspector selected) → records availability → requests the client price → **Accountant** sets
  the price → Coordinator sends CVs & price (client email pre-filled) → records direct selection → assigns
  (confirmation email) → schedules the job (automatic reminder queued) → sends a manual reminder → marks
  the job done (report request queued) → uploads the report → sends the completion email (project
  Completed, Invoice pending) → **Accountant** uploads the invoice (due date = invoice date + client terms)
  → sends a payment reminder → confirms payment → project shows Paid.
- Second flow: interview path from a grid deep link (schedule interview → passed → assign), inspector form
  refuses to save without a CV, a new skill is created from the skills field.
- Responsive check at 390 / 768 / 1024 / 1920 px: no horizontal page overflow on 20 key pages.
- **Not done:** no React Profiler measurement, no screen-reader test, and the Google Maps iframe could not
  load in the sandbox (no internet) — the fallback and the "Open in Google Maps" link were checked instead.
