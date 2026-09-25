import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { CreatableMultiSelectField, FormGrid, NumberField, SelectField, TextField } from "@/components/forms/fields"
import { AddressFields, addressSchema, emptyAddress } from "@/components/forms/address"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { DetailSkeleton, Spinner } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useLookupOptions } from "@/features/settings/lookups"
import { useAddSkill } from "@/features/settings/hooks"
import { useDocuments } from "@/features/documents/hooks"
import { toFileMeta } from "@/lib/format"
import type { InspectorRow } from "@/services"
import { useInspector, useSaveInspector } from "./hooks"

const money = (label: string) => z.number({ error: `${label} is required` }).min(0, "Cannot be negative")
const schema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number"),
  nationality: z.string().trim().min(2, "Nationality is required"),
  address: addressSchema,
  currency: z.string().min(1, "Select a currency"),
  manDayRate: money("Man-day rate"),
  lumpSumRate: money("Lump sum rate"),
  hourlyRate: money("Hourly rate"),
  roundTrip: money("Round trip"),
  engagementType: z.enum(["Freelance", "Supplier-based", "Outsourced"]),
  skills: z.array(z.string()).min(1, "Select or add at least one skill"),
  qualificationsText: z.string().trim().min(2, "List at least one qualification"),
  status: z.enum(["Available", "On Assignment", "Inactive"]),
})
type Values = z.infer<typeof schema>

export function InspectorFormPage() {
  const { inspectorId } = useParams()
  const q = useInspector(inspectorId ?? "")
  if (inspectorId && q.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (inspectorId && q.isError) return <PageContainer><ErrorState message={q.error.message} onRetry={() => void q.refetch()} /></PageContainer>
  return <InspectorForm key={inspectorId ?? "new"} initial={inspectorId ? q.data : undefined} />
}

function InspectorForm({ initial }: { initial?: InspectorRow }) {
  const navigate = useNavigate()
  const { currencyOptions, skillOptions } = useLookupOptions()
  const addSkill = useAddSkill()
  const save = useSaveInspector()
  const docs = useDocuments({ entityType: "Inspector", entityId: initial?.id ?? "__none__" })
  const currentCv = initial ? (docs.data ?? []).find((d) => d.category === "CV") : undefined
  const [cv, setCv] = useState<File[]>([])
  const [cvError, setCvError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { ...initial, qualificationsText: initial.qualifications.join(", ") }
      : ({ name: "", email: "", phone: "", nationality: "Indian", address: emptyAddress(), currency: "INR", manDayRate: undefined, lumpSumRate: undefined, hourlyRate: undefined, roundTrip: undefined, engagementType: "Freelance", skills: [], qualificationsText: "", status: "Available" } as unknown as Values),
  })
  const currency = useWatch({ control: form.control, name: "currency" })
  const back = initial ? `/inspectors/${initial.id}` : "/inspectors"

  const checkCv = () => {
    const err = !initial && cv.length === 0 ? "Upload the inspector's CV" : cv[0] && cv[0].size > 10 * 1024 * 1024 ? "CV must be 10 MB or smaller" : null
    setCvError(err)
    return !err
  }
  const onSubmit = ({ qualificationsText, ...v }: Values) => {
    if (!checkCv()) return
    const input = { ...v, qualifications: qualificationsText.split(",").map((s) => s.trim()).filter(Boolean) }
    save.mutate({ id: initial?.id, input, cv: cv[0] ? toFileMeta(cv[0]) : null }, { onSuccess: (r) => navigate(`/inspectors/${r.id}`) })
  }

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title={initial ? `Edit ${initial.name}` : "Add inspector"}
        description={initial ? "Update details, rates, skills or replace the CV. Certificates are managed on the profile." : "Contact details, location, rates, skills and CV. Add certificates from the profile after saving."}
        breadcrumbs={[{ label: "Inspectors", to: "/inspectors" }, ...(initial ? [{ label: initial.name, to: back }] : []), { label: initial ? "Edit" : "New" }]}
        backTo={{ to: back, label: "previous page" }}
      />
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit, () => checkCv())} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent>
              <FormGrid>
                <TextField control={form.control} name="name" label="Full name" required />
                <TextField control={form.control} name="email" label="Email" required type="email" />
                <TextField control={form.control} name="phone" label="Phone" required type="tel" />
                <TextField control={form.control} name="nationality" label="Nationality" required />
                <SelectField control={form.control} name="engagementType" label="Engagement" required options={["Freelance", "Supplier-based", "Outsourced"]} />
                <SelectField control={form.control} name="status" label="Availability" required options={["Available", "On Assignment", "Inactive"]} />
              </FormGrid>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Location</CardTitle><CardDescription>Used to find inspectors near a job site.</CardDescription></CardHeader>
            <CardContent><AddressFields control={form.control} setValue={form.setValue} name="address" /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Skills & qualifications</CardTitle><CardDescription>Projects match inspectors on these skills. Type to add a skill that isn't listed.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <CreatableMultiSelectField control={form.control} name="skills" label="Skills" required options={skillOptions} placeholder="Select or add skills" onCreate={(s) => addSkill.mutate(s)} />
              <TextField control={form.control} name="qualificationsText" label="Certifications & qualifications" required placeholder="CSWIP 3.1, API 510, ASNT Level II (UT)" description="Separate with commas" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Inspector rates</CardTitle><CardDescription>What Praveg pays the inspector. The price sent to the client is set per job by Accounts.</CardDescription></CardHeader>
            <CardContent>
              <FormGrid className="sm:grid-cols-3">
                <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
                <NumberField control={form.control} name="manDayRate" label="Man-day rate" required prefix={currency || undefined} />
                <NumberField control={form.control} name="lumpSumRate" label="Lump sum rate" required prefix={currency || undefined} />
                <NumberField control={form.control} name="hourlyRate" label="Hourly rate" required prefix={currency || undefined} />
                <NumberField control={form.control} name="roundTrip" label="Round trip" required prefix={currency || undefined} />
              </FormGrid>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>CV{!initial && <span className="text-danger" aria-hidden> *</span>}</CardTitle>
              <CardDescription>{initial ? "Upload a new file only to replace the current CV." : "Required. This is the CV sent to clients."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentCv && cv.length === 0 && (
                <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm"><FileText className="size-4 text-primary-text" aria-hidden /> Current: <span className="font-medium">{currentCv.name}</span></p>
              )}
              <FileDropzone files={cv} onChange={(f) => { setCv(f); setCvError(null) }} multiple={false} accept=".pdf,.doc,.docx" maxSizeMb={10} hint="PDF or Word · up to 10 MB" invalid={!!cvError} />
              {cvError && <p className="text-sm text-danger" role="alert">{cvError}</p>}
            </CardContent>
          </Card>
          <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:bg-card">
            <Button type="button" variant="outline" onClick={() => navigate(back)} disabled={save.isPending}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Spinner />} {initial ? "Save changes" : "Add inspector"}</Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  )
}
