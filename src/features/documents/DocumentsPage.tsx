import { useMemo, useState } from "react"
import { FolderOpen, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { SearchInput } from "@/components/common/SearchInput"
import { ALL, FilterBar, FilterSelect } from "@/components/common/FilterBar"
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
export function DocumentsPage() {
  const role = useRole()
  const q = useDocuments()
  const canDelete = usePermission("documents", "delete")
  const canUploadTemplates = usePermission("settings", "edit")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState(ALL)
  const [linked, setLinked] = useState(ALL)
  const [upload, setUpload] = useState(false)

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    return (q.data ?? [])
      // Accountants see PO and finance-relevant documents only (draft matrix)
      .filter((d) => role !== "Accountant" || d.category === "Purchase Order" || d.category === "Out Document")
      .filter((d) => (category === ALL || d.category === category) && (linked === ALL || d.entityType === linked) && (!s || `${d.name} ${d.entityLabel}`.toLowerCase().includes(s)))
  }, [q.data, search, category, linked, role])

  const filtered = !!search || category !== ALL || linked !== ALL
  return (
    <PageContainer>
      <PageHeader
        title="Documents"
        description="Inspector CVs & certificates, inspector confirmations, technical documents, reports, POs and templates — stored centrally with role-based access."
        actions={canUploadTemplates && <Button variant="outline" onClick={() => setUpload(true)}><Upload /> Upload template</Button>}
      />
      <Card className="gap-0 overflow-hidden py-0">
        <div className="border-b p-4">
          <FilterBar showReset={filtered} onReset={() => { setSearch(""); setCategory(ALL); setLinked(ALL) }}>
            <SearchInput value={search} onChange={setSearch} placeholder="File name or linked record" />
            <FilterSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES} allLabel="All categories" className="sm:w-52" />
            <FilterSelect label="Linked to" value={linked} onChange={setLinked} options={[{ value: "Inspector", label: "Inspectors" }, { value: "Project", label: "Projects" }, { value: "Client", label: "Clients" }, { value: "Library", label: "Template library" }]} allLabel="Any record" />
          </FilterBar>
          <p className="mt-2 text-xs text-muted-foreground">To attach a file to a project, client or inspector, upload it from that record so it's linked correctly.</p>
        </div>
        {q.isError ? <ErrorState message={q.error.message} onRetry={() => void q.refetch()} /> : (
          <DocumentsTable rows={rows} loading={q.isPending} canDelete={canDelete} showEntity
            empty={<EmptyState icon={FolderOpen} title={filtered ? "No documents match" : "No documents yet"} description={filtered ? "Try another category or clear the filters." : "Documents uploaded to records will appear here."} />}
          />
        )}
      </Card>
      <UploadDialog open={upload} onOpenChange={setUpload} entityType="Library" entityId="library" categories={["Template"]} title="Upload template" />
    </PageContainer>
  )
}
