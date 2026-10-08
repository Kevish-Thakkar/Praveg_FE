import { useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, useParams } from "react-router-dom"
import { FileTypeIcon } from "@/components/common/FileTypeIcon"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { CreatableMultiSelectField, FormGrid, NumberField, SelectField, TextField } from "@/components/forms/fields"
import { AddressFields, addressSchema, emptyAddress } from "@/components/forms/address"
import { FileDropzone } from "@/components/forms/FileDropzone"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { ReviewSection, StepperFooter, StepperLayout } from "@/components/forms/FormStepper"
import { DescriptionList } from "@/components/common/DescriptionList"
import { useFormStepper, type StepDef } from "@/hooks/use-form-stepper"
import { formatAddress } from "@/constants/geo"
import { formatMoney } from "@/lib/format"
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
  const steps = useMemo<StepDef<Values>[]>(() => [
    { id: "profile", title: "Profile", description: "Contact details, engagement and availability.", fields: ["name", "email", "phone", "nationality", "engagementType", "status"] },
    { id: "location", title: "Location", description: "Used to find inspectors near a job site.", fields: ["address"] },
    { id: "skills", title: "Skills", description: "Projects match inspectors on these skills. Type to add a skill that isn't listed.", fields: ["skills", "qualificationsText"] },
    { id: "rates", title: "Rates", description: "What Praveg pays the inspector. The price sent to the client is set per job.", fields: ["currency", "manDayRate", "lumpSumRate", "hourlyRate", "roundTrip"] },
    { id: "cv", title: "CV", description: initial ? "Upload a new file only to replace the current CV." : "Required. This is the CV sent to clients." },
    { id: "review", title: "Review", description: "Check the details before saving." },
  ], [initial])
  const stepper = useFormStepper({ form, steps })
  const values = useWatch({ control: form.control }) as Values
  const currency = values.currency
  const back = initial ? `/inspectors/${initial.id}` : "/inspectors"

  const checkCv = () => {
    const err = !initial && cv.length === 0 ? "Upload the inspector's CV" : null
    setCvError(err)
    return !err
  }
  const onValid = ({ qualificationsText, ...v }: Values) => {
    if (!checkCv()) { void stepper.goTo(steps.findIndex((s) => s.id === "cv")); return }
    const input = { ...v, qualifications: qualificationsText.split(",").map((x) => x.trim()).filter(Boolean) }
    save.mutate({ id: initial?.id, input, cv: cv[0] ? toFileMeta(cv[0]) : null }, { onSuccess: (r) => navigate(`/inspectors/${r.id}`) })
  }
  const goToStep = (id: string) => void stepper.goTo(steps.findIndex((x) => x.id === id))
  const next = () => {
    if (stepper.step.id === "cv" && !checkCv()) return
    void stepper.next()
  }
  const money = (n: number | undefined) => (n === undefined || n === null || Number.isNaN(n) ? "—" : formatMoney(n, currency || "INR"))

  return (
    <PageContainer>
      <PageHeader
        title={initial ? `Edit ${initial.name}` : "Add inspector"}
        description={initial ? "Update details, rates, skills or replace the CV. Certificates are managed on the profile." : "Add an inspector in a few short steps. Certificates can be added from the profile after saving."}
        breadcrumbs={[{ label: "Inspectors", to: "/inspectors" }, ...(initial ? [{ label: initial.name, to: back }] : []), { label: initial ? "Edit" : "New" }]}
      />
      <Form {...form}>
        <form
          noValidate
          className="min-w-0"
          onSubmit={(e) => {
            if (!stepper.isLast) { e.preventDefault(); next(); return }
            void form.handleSubmit(onValid, () => void stepper.validateAll())(e)
          }}
        >
          <StepperLayout
            steps={stepper.steps.map((x) => (x.id === "cv" && cvError ? { ...x, status: "error" as const } : x))}
            onStep={(i) => void stepper.goTo(i)}
            title={stepper.step.title}
            description={stepper.step.description}
            footer={
              <StepperFooter
            isFirst={stepper.isFirst} isLast={stepper.isLast} onBack={stepper.back} onNext={next} onCancel={() => navigate(back)}
            submitting={save.isPending} submitLabel={initial ? "Save changes" : "Add inspector"}
          />
            }
          >
              {stepper.step.id === "profile" && (
                <FormGrid>
                  <TextField control={form.control} name="name" label="Full name" required />
                  <TextField control={form.control} name="email" label="Email" required type="email" />
                  <TextField control={form.control} name="phone" label="Phone" required type="tel" />
                  <TextField control={form.control} name="nationality" label="Nationality" required />
                  <SelectField control={form.control} name="engagementType" label="Engagement" required options={["Freelance", "Supplier-based", "Outsourced"]} />
                  <SelectField control={form.control} name="status" label="Availability" required options={["Available", "On Assignment", "Inactive"]} />
                </FormGrid>
              )}
              {stepper.step.id === "location" && <AddressFields control={form.control} setValue={form.setValue} name="address" />}
              {stepper.step.id === "skills" && (
                <>
                  <CreatableMultiSelectField control={form.control} name="skills" label="Skills" required options={skillOptions} placeholder="Select or add skills" onCreate={(x) => addSkill.mutate(x)} />
                  <TextField control={form.control} name="qualificationsText" label="Certifications & qualifications" required placeholder="CSWIP 3.1, API 510, ASNT Level II (UT)" description="Separate with commas" />
                </>
              )}
              {stepper.step.id === "rates" && (
                <FormGrid className="sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField control={form.control} name="currency" label="Currency" required options={currencyOptions} />
                  <NumberField control={form.control} name="manDayRate" label="Man-day rate" required prefix={currency || undefined} />
                  <NumberField control={form.control} name="lumpSumRate" label="Lump sum rate" required prefix={currency || undefined} />
                  <NumberField control={form.control} name="hourlyRate" label="Hourly rate" required prefix={currency || undefined} />
                  <NumberField control={form.control} name="roundTrip" label="Round trip" required prefix={currency || undefined} />
                </FormGrid>
              )}
              {stepper.step.id === "cv" && (
                <div className="space-y-3">
                  {currentCv && cv.length === 0 && (
                    <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2.5 text-sm"><FileTypeIcon name={currentCv.name} className="size-5" /> Current: <span className="font-medium">{currentCv.name}</span></p>
                  )}
                  <FileDropzone files={cv} onChange={(f) => { setCv(f); setCvError(null) }} multiple={false} accept=".pdf,.doc,.docx" hint="PDF or Word" invalid={!!cvError} />
                  {cvError && <p className="text-sm text-danger" role="alert">{cvError}</p>}
                </div>
              )}
              {stepper.step.id === "review" && (
                <div className="grid gap-3 xl:grid-cols-2">
                  <ReviewSection title="Profile" onEdit={() => goToStep("profile")}>
                    <DescriptionList items={[
                      { label: "Name", value: values.name || "—" }, { label: "Email", value: values.email || "—" },
                      { label: "Phone", value: values.phone || "—" }, { label: "Nationality", value: values.nationality || "—" },
                      { label: "Engagement", value: values.engagementType }, { label: "Availability", value: values.status },
                    ]} />
                  </ReviewSection>
                  <ReviewSection title="Location" onEdit={() => goToStep("location")}><p className="text-sm">{values.address?.city ? formatAddress(values.address) : "—"}</p></ReviewSection>
                  <ReviewSection title="Skills" onEdit={() => goToStep("skills")}>
                    <DescriptionList items={[{ label: "Skills", value: values.skills?.join(", ") || "—", span: 2 }, { label: "Qualifications", value: values.qualificationsText || "—", span: 2 }]} />
                  </ReviewSection>
                  <ReviewSection title="Rates" onEdit={() => goToStep("rates")}>
                    <DescriptionList columns={3} items={[
                      { label: "Man-day", value: money(values.manDayRate) }, { label: "Lump sum", value: money(values.lumpSumRate) },
                      { label: "Hourly", value: money(values.hourlyRate) }, { label: "Round trip", value: money(values.roundTrip) },
                    ]} />
                  </ReviewSection>
                  <ReviewSection title="CV" onEdit={() => goToStep("cv")}><p className="text-sm">{cv[0]?.name ?? currentCv?.name ?? "No CV selected"}</p></ReviewSection>
                </div>
              )}
          </StepperLayout>
        </form>
      </Form>
    </PageContainer>
  )
}
