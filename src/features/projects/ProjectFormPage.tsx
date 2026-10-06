import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { Copy, MapPin, Send } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ComboboxField, CreatableMultiSelectField, DateField, FormGrid, MultiSelectField, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { AddressFields, MapPreview, addressSchema, emptyAddress } from "@/components/forms/address"
import { DetailSkeleton } from "@/components/feedback/LoadingState"
import { ReviewSection, StepperFooter, StepperLayout } from "@/components/forms/FormStepper"
import { DescriptionList } from "@/components/common/DescriptionList"
import { useFormStepper, type StepDef } from "@/hooks/use-form-stepper"
import { formatAddress } from "@/constants/geo"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useLookupOptions } from "@/features/settings/lookups"
import { useAddSkill } from "@/features/settings/hooks"
import { useVendors } from "@/features/vendors/hooks"
import { useCurrentUser } from "@/store/session.store"
import { daysFromToday, formatDate } from "@/lib/dates"
import type { Address } from "@/types/domain"
import type { ProjectRow } from "@/services"
import { InspectorMatches } from "./components/InspectorMatches"
import { useCreateProject, useProject, useUpdateProject } from "./hooks"

const schema = z.object({
  title: z.string().trim().min(3, "Give the project a name").max(140),
  clientId: z.string().min(1, "Select a client"),
  vendorIds: z.array(z.string()),
  serviceId: z.string().min(1, "Select the service requested"),
  requiredSkills: z.array(z.string()),
  site: addressSchema,
  description: z.string().max(1500),
  requiredBy: z.string({ error: "When does the client need it?" }).min(1, "When does the client need it?"),
  coordinatorId: z.string().min(1, "Select a coordinator"),
})
type Values = z.infer<typeof schema>

export function ProjectFormPage() {
  const { projectId } = useParams()
  const project = useProject(projectId ?? "")
  if (projectId && project.isPending) return <PageContainer><DetailSkeleton /></PageContainer>
  if (projectId && project.isError) return <PageContainer><ErrorState message={project.error.message} onRetry={() => void project.refetch()} /></PageContainer>
  if (projectId && project.data?.locked) return <Navigate to={`/projects/${projectId}`} replace />
  return <ProjectForm key={projectId ?? "new"} initial={projectId ? project.data : undefined} />
}

function ProjectForm({ initial }: { initial?: ProjectRow }) {
  const navigate = useNavigate()
  const me = useCurrentUser()
  const lookups = useLookupOptions()
  const addSkill = useAddSkill()
  const create = useCreateProject()
  const update = useUpdateProject(initial?.id ?? "")
  const saving = create.isPending || update.isPending
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? { title: initial.title, clientId: initial.clientId, vendorIds: initial.vendorIds, serviceId: initial.serviceId, requiredSkills: initial.requiredSkills, site: initial.site, description: initial.description, requiredBy: initial.requiredBy, coordinatorId: initial.coordinatorId }
      : { title: "", clientId: "", vendorIds: [], serviceId: "", requiredSkills: [], site: emptyAddress(), description: "", requiredBy: daysFromToday(14), coordinatorId: me.role === "Coordinator" ? me.id : "" },
  })

  const steps = useMemo<StepDef<Values>[]>(() => [
    { id: "basics", title: "Client & service", description: "Who the job is for, what they need and by when.", fields: ["clientId", "vendorIds", "serviceId", "requiredBy", "title", "coordinatorId"] },
    { id: "scope", title: "Scope & skills", description: "What the inspector will do and the skills needed. Skills are used to match inspectors.", fields: ["requiredSkills", "description"] },
    { id: "site", title: "Site", description: "Where the inspection takes place. Nearby inspectors are found from this location.", fields: ["site"] },
    ...(!initial ? [{ id: "inspectors", title: "Inspectors", description: "Optionally email nearby inspectors for availability as soon as the inquiry is saved.", optional: true }] : []),
    { id: "review", title: "Review", description: initial ? "Check the changes before saving." : "Check the inquiry before creating it." },
  ], [initial])
  const stepper = useFormStepper({ form, steps, draftKey: initial ? undefined : `inquiry:v2:${me.id}` })

  const clientId = useWatch({ control: form.control, name: "clientId" })
  const vendorIds = useWatch({ control: form.control, name: "vendorIds" })
  const site = useWatch({ control: form.control, name: "site" }) as Address
  const skills = useWatch({ control: form.control, name: "requiredSkills" })
  const values = useWatch({ control: form.control }) as Values
  // vendors are independent of clients — every vendor can be chosen, several per project
  const vendors = useVendors()
  const vendorOptions = useMemo(() => (vendors.data ?? []).map((v) => ({ value: v.id, label: v.name, hint: `${v.address.city}, ${v.address.state}` })), [vendors.data])
  const chosenVendors = useMemo(() => (vendorIds ?? []).map((id) => vendors.data?.find((v) => v.id === id)).filter((v) => !!v), [vendorIds, vendors.data])

  const copyAddress = (a: Address | undefined) => { if (a) form.setValue("site", { ...a }, { shouldValidate: true }) }
  const clientAddress = () => lookups.clients.find((c) => c.id === clientId)?.address
  // new inquiry: default site = first vendor's address (if any) else the client's, only while the site is empty
  useEffect(() => {
    if (initial || form.getValues("site.city")) return
    copyAddress(chosenVendors[0]?.address ?? (clientId ? clientAddress() : undefined))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, chosenVendors])

  const back = initial ? `/projects/${initial.id}` : "/projects"
  const onValid = (v: Values) => {
    const input = { ...v, vendorIds: v.vendorIds ?? [] }
    if (initial) update.mutate(input, { onSuccess: () => navigate(back) })
    else create.mutate({ input, inspectorIds: [...selected] }, { onSuccess: (p) => { stepper.clearDraft(); navigate(`/projects/${p.id}`) } })
  }
  const label = (opts: { value: string; label: string }[], v: string | undefined) => opts.find((o) => o.value === v)?.label ?? "—"
  const goToStep = (id: string) => void stepper.goTo(steps.findIndex((s) => s.id === id))

  return (
    <PageContainer>
      <PageHeader
        title={initial ? `Edit ${initial.code}` : "New inquiry"}
        description={initial ? "Update the job details. The workflow itself is managed on the project page." : "Capture what the client needs in a few short steps."}
        breadcrumbs={[{ label: "Projects", to: "/projects" }, ...(initial ? [{ label: initial.code, to: back }] : []), { label: initial ? "Edit" : "New inquiry" }]}
      />
      {stepper.restoredAt && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-info-soft px-4 py-3 text-sm text-info">
          Draft restored from {formatDate(stepper.restoredAt, "dd MMM, HH:mm")}.
          <Button type="button" variant="ghost" size="sm" onClick={() => { stepper.clearDraft(); form.reset(); void stepper.goTo(0) }}>Discard draft</Button>
        </p>
      )}
      <Form {...form}>
        <form
          noValidate
          className="min-w-0"
          onSubmit={(e) => {
            if (!stepper.isLast) { e.preventDefault(); void stepper.next(); return }
            void form.handleSubmit(onValid, () => void stepper.validateAll())(e)
          }}
        >
          <StepperLayout
            steps={stepper.steps}
            onStep={(i) => void stepper.goTo(i)}
            title={stepper.step.title}
            description={stepper.step.description}
            actions={stepper.step.id === "site" && (
              <>
                <Button type="button" size="sm" variant="ghost" disabled={!clientId} onClick={() => copyAddress(clientAddress())}><Copy /> Use client address</Button>
                {chosenVendors.length > 1 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="ghost"><Copy /> Use vendor address</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {chosenVendors.map((v) => <DropdownMenuItem key={v.id} onSelect={() => copyAddress(v.address)}>{v.name}<span className="ml-auto pl-3 text-xs text-muted-foreground">{v.address.city}</span></DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button type="button" size="sm" variant="ghost" disabled={!chosenVendors.length} onClick={() => copyAddress(chosenVendors[0]?.address)}><Copy /> Use vendor address</Button>
                )}
              </>
            )}
            footer={
  <StepperFooter
      isFirst={stepper.isFirst}
      isLast={stepper.isLast}
      onBack={stepper.back}
      onNext={() => void stepper.next()}
      onCancel={() => navigate(back)}
      onSaveDraft={initial ? undefined : stepper.saveDraft}
      draftSavedAt={stepper.draftSavedAt}
      submitting={saving}
      note={stepper.step.id === "inspectors" ? (selected.size ? `${selected.size} selected` : "Optional — you can skip this step") : undefined}
      submitLabel={<>{!initial && selected.size ? <Send /> : null}{initial ? "Save changes" : selected.size ? `Create & request ${selected.size}` : "Create inquiry"}</>}
    />
            }
          >
              {stepper.step.id === "basics" && (
                <>
                  <TextField control={form.control} name="title" label="Project name" required placeholder="e.g. Reactor R-201 — third-party inspection" />
                  <FormGrid>
                    <ComboboxField control={form.control} name="clientId" label="Client" required options={lookups.clientOptions} searchPlaceholder="Search clients…" />
                    <MultiSelectField control={form.control} name="vendorIds" label="Vendors" options={vendorOptions} placeholder="None — job at the client's site" description="Select one or more vendors, or leave empty" />
                    <SelectField control={form.control} name="serviceId" label="Service requested" required options={lookups.typeOptions} />
                    <DateField control={form.control} name="requiredBy" label="Required by" required />
                    <SelectField control={form.control} name="coordinatorId" label="Coordinator" required options={lookups.coordinatorOptions} />
                  </FormGrid>
                </>
              )}
              {stepper.step.id === "scope" && (
                <>
                  <CreatableMultiSelectField control={form.control} name="requiredSkills" label="Required inspector skills" options={lookups.skillOptions} placeholder="Select or add skills" onCreate={(s) => addSkill.mutate(s)} description="Type to add a skill that isn't listed" />
                  <TextareaField control={form.control} name="description" label="Scope / notes" rows={5} placeholder="Items, standards, quantity, access requirements…" />
                </>
              )}
              {stepper.step.id === "site" && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
                  <AddressFields control={form.control} setValue={form.setValue} name="site" lineLabel="Site address" showMap={false} />
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium"><MapPin className="size-4 text-primary-text" aria-hidden /> Location preview</p>
                    <MapPreview address={site} height="h-56" />
                  </div>
                </div>
              )}
              {stepper.step.id === "inspectors" && (
                <InspectorMatches site={site?.city ? site : null} skills={skills ?? []} selected={selected} onSelectedChange={setSelected} />
              )}
              {stepper.step.id === "review" && (
                <div className="grid gap-3 xl:grid-cols-2">
                  <ReviewSection title="Client & service" onEdit={() => goToStep("basics")}>
                    <DescriptionList items={[
                      { label: "Project name", value: values.title || "—", span: 2 },
                      { label: "Client", value: label(lookups.clientOptions, values.clientId) },
                      { label: "Vendors", value: chosenVendors.length ? chosenVendors.map((v) => v.name).join(", ") : "None" },
                      { label: "Service", value: label(lookups.typeOptions, values.serviceId) },
                      { label: "Required by", value: formatDate(values.requiredBy) },
                      { label: "Coordinator", value: label(lookups.coordinatorOptions, values.coordinatorId) },
                    ]} />
                  </ReviewSection>
                  <ReviewSection title="Scope & skills" onEdit={() => goToStep("scope")}>
                    <DescriptionList items={[
                      { label: "Skills", value: values.requiredSkills?.length ? values.requiredSkills.join(", ") : "None specified", span: 2 },
                      { label: "Scope / notes", value: values.description || "—", span: 2 },
                    ]} />
                  </ReviewSection>
                  <ReviewSection title="Site" onEdit={() => goToStep("site")}>
                    <p className="text-sm">{values.site?.city ? formatAddress(values.site) : "—"}</p>
                  </ReviewSection>
                  {!initial && (
                    <ReviewSection title="Inspectors" onEdit={() => goToStep("inspectors")}>
                      <p className="text-sm">{selected.size ? `${selected.size} inspector(s) will receive the availability & confirmation email.` : "No inspectors selected — you can request availability later from the project."}</p>
                    </ReviewSection>
                  )}
                </div>
              )}
          </StepperLayout>

        </form>
      </Form>
    </PageContainer>
  )
}
