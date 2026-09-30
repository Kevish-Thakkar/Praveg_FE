import { useMemo, useState } from "react"
import { FolderOpen, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ListToolbar } from "@/components/tables/ListToolbar"
import { useUrlFilters, useUrlSearch } from "@/hooks/use-list-state"
import { EmptyState } from "@/components/common/EmptyState"
import { usePermission } from "@/components/common/Can"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useRole } from "@/store/session.store"
import type { DocumentCategory } from "@/types/domain"
import { useDocuments } from "./hooks"
import { DocumentsTable } from "./components/DocumentsTable"
import { UploadDialog } from "./components/UploadDialog"

const CATEGORIES: DocumentCategory[] = ["CV", "Certificate", "Inspector Confirmation", "Technical Document", "Report", "Out Document", "Purchase Order", "Invoice", "Template", "Other"]

/** §6.4 / §6.9 — central, access-controlled repository */
const KEYS = ["category", "linked"] as const

export function DocumentsPage() {
  const role = useRole()
  const q = useDocuments()
  const canDelete = usePermission("documents", "delete")
  const canUploadTemplates = usePermission("settings", "edit")
  const [search, setSearch] = useUrlSearch()
  const f = useUrlFilters(KEYS)
  const { category, linked } = f.values
  const [upload, setUpload] = useState(false)

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? [])
      // Accountants see PO and finance-relevant documents only (draft matrix)
      .filter((d) => role !== "Accountant" || d.category === "Purchase Order" || d.category === "Out Document")
      .filter((d) => (!category.length || category.includes(d.category)) && (!linked.length || linked.includes(d.entityType)) && (!s || `${d.name} ${d.entityLabel}`.toLowerCase().includes(s)))
  }, [q.data, search, category, linked, role])

  const filtered = !!search || f.activeCount > 0
  return (
    <PageContainer>
      <PageHeader
        title="Document library"
        description="Inspector CVs & certificates, inspector confirmations, technical documents, reports, POs and templates — stored centrally with role-based access."
        actions={canUploadTemplates && <Button variant="outline" onClick={() => setUpload(true)}><Upload /> Upload template</Button>}
      />
      <Card className="gap-0 overflow-hidden py-0">
        <ListToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search file name or linked record" }}
          filters={[
            { id: "category", label: "Category", options: CATEGORIES.map((c) => ({ value: c, label: c })), value: category, onChange: (v) => f.set("category", v) },
            { id: "linked", label: "Linked to", options: [{ value: "Project", label: "Projects" }, { value: "Inspector", label: "Inspectors" }, { value: "Client", label: "Clients" }, { value: "Library", label: "Template library" }], value: linked, onChange: (v) => f.set("linked", v) },
          ]}
          onClearFilters={f.clear}
        />
        <p className="border-b bg-muted/40 px-5 py-2.5 text-xs text-muted-foreground">To attach a file to a project, client or inspector, upload it from that record so it's linked correctly.</p>
        {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <DocumentsTable fill rows={rows} loading={q.isPending} canDelete={canDelete} showEntity
            empty={<EmptyState icon={FolderOpen} title={filtered ? "No documents match" : "No documents yet"} description={filtered ? "Try another category or clear the filters." : "Documents uploaded to records will appear here."} />}
          />
        )}
      </Card>
      <UploadDialog open={upload} onOpenChange={setUpload} entityType="Library" entityId="library" categories={["Template"]} title="Upload template" />
    </PageContainer>
  )
}
