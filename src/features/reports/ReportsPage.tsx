import { useState } from "react"
import { toast } from "sonner"
import { FileBarChart, FileDown } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { REPORTS, reportService, type ReportDefinition } from "@/services"
import { useRole } from "@/store/session.store"

type Format = "PDF" | "Excel" | "CSV"

/** Workflow diagram step 5 — "Report Generation (as per formats)" */
export function ReportsPage() {
  const role = useRole()
  const reports = REPORTS.filter((r) => r.audience.includes(role))
  return (
    <PageContainer>
      <PageHeader title="Reports" description="Generate operational and finance reports. Output formats will follow Praveg's templates." />
      {reports.length === 0 ? <Card><EmptyState icon={FileBarChart} title="No reports for your role" /></Card> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{reports.map((r) => <ReportCard key={r.id} report={r} />)}</div>
      )}
    </PageContainer>
  )
}

function ReportCard({ report }: { report: ReportDefinition }) {
  const [format, setFormat] = useState<Format>("PDF")
  const [progress, setProgress] = useState<number | null>(null)
  const generate = async () => {
    setProgress(15)
    const t = setInterval(() => setProgress((p) => (p === null ? null : Math.min(90, p + 20))), 150)
    try {
      const r = await reportService.generate(report.id, format)
      setProgress(100)
      toast.success(`${r.fileName} is ready`, { description: "Prototype — no file is produced." })
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      clearInterval(t)
      setTimeout(() => setProgress(null), 600)
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileBarChart className="size-4 text-primary-text" /> {report.name}</CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent>{progress !== null && <Progress value={progress} aria-label={`Generating ${report.name}`} />}</CardContent>
      <CardFooter className="mt-auto gap-2">
        <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
          <SelectTrigger className="w-28" aria-label="Format"><SelectValue /></SelectTrigger>
          <SelectContent>{(["PDF", "Excel", "CSV"] as const).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void generate()} disabled={progress !== null}><FileDown /> Generate</Button>
      </CardFooter>
    </Card>
  )
}
