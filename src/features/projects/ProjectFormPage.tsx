import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useNavigate, useParams } from "react-router-dom"
import { Copy, MapPin, Send, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"
import { ComboboxField, CreatableMultiSelectField, DateField, FormGrid, SelectField, TextareaField, TextField } from "@/components/forms/fields"
import { AddressFields, MapPreview, addressSchema, emptyAddress } from "@/components/forms/address"
import { DetailSkeleton, Spinner } from "@/components/feedback/LoadingState"
import { ErrorState } from "@/components/feedback/ErrorState"
import { useLookupOptions } from "@/features/settings/lookups"
import { useAddSkill } from "@/features/settings/hooks"
import { useVendors } from "@/features/vendors/hooks"
import { useCurrentUser } from "@/store/session.store"
import { daysFromToday } from "@/lib/dates"
import type { Address } from "@/types/domain"
import type { ProjectRow } from "@/services"
import { InspectorMatches } from "./components/InspectorMatches"
import { useCreateProject, useProject, useUpdateProject } from "./hooks"

const NONE = "__none__"
const schema = z.object({
  title: z.string().trim().min(3, "Give the project a name").max(140),
  clientId: z.string().min(1, "Select a client"),
  vendorId: z.string(),
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
      ? { title: initial.title, clientId: initial.clientId, vendorId: initial.vendorId ?? NONE, serviceId: initial.serviceId, requiredSkills: initial.requiredSkills, site: initial.site, description: initial.description, requiredBy: initial.requiredBy, coordinatorId: initial.coordinatorId }
      : { title: "", clientId: "", vendorId: NONE, serviceId: "", requiredSkills: [], site: emptyAddress(), description: "", requiredBy: daysFromToday(14), coordinatorId: me.role === "Coordinator" ? me.id : "" },
  })

  const clientId = useWatch({ control: form.control, name: "clientId" })
  const vendorId = useWatch({ control: form.control, name: "vendorId" })
  const site = useWatch({ control: form.control, name: "site" }) as Address
  const skills = useWatch({ control: form.control, name: "requiredSkills" })
  const vendors = useVendors(clientId || "__none__")
  const vendorOptions = useMemo(() => [{ value: NONE, label: "No vendor / at client's site" }, ...(vendors.data ?? []).map((v) => ({ value: v.id, label: v.name, hint: `${v.address.city}, ${v.address.state}` }))], [vendors.data])

  // vendor must belong to the selected client
  useEffect(() => {
    if (vendorId !== NONE && vendors.data && !vendors.data.some((v) => v.id === vendorId)) form.setValue("vendorId", NONE)
  }, [vendors.data, vendorId, form])

  const copyAddress = (from: "client" | "vendor") => {
    const a = from === "client" ? lookups.clients.find((c) => c.id === clientId)?.address : vendors.data?.find((v) => v.id === vendorId)?.address
    if (a) form.setValue("site", { ...a }, { shouldValidate: true })
  }
  // new inquiry: default site = vendor address (if chosen) else client address, only while the site is empty
  useEffect(() => {
    if (initial || form.getValues("site.city")) return
    if (vendorId !== NONE) copyAddress("vendor")
    else if (clientId) copyAddress("client")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, vendorId, vendors.data])

  const back = initial ? `/projects/${initial.id}` : "/projects"
  const onSubmit = (v: Values) => {
    const input = { ...v, vendorId: v.vendorId === NONE ? null : v.vendorId }
    if (initial) update.mutate(input, { onSuccess: () => navigate(back) })
    else create.mutate({ input, inspectorIds: [...selected] }, { onSuccess: (p) => navigate(`/projects/${p.id}`) })
  }

  return (
    <PageContainer className="max-w-7xl">
      <PageHeader
        title={initial ? `Edit ${initial.code}` : "New inquiry"}
        description={initial ? "Update the job details. Stage and workflow steps are managed on the project page." : "Capture what the client needs. Nearby inspectors with matching skills are listed so you can request availability straight away."}
        breadcrumbs={[{ label: "Projects", to: "/projects" }, ...(initial ? [{ label: initial.code, to: back }] : []), { label: initial ? "Edit" : "New inquiry" }]}
        backTo={{ to: back, label: "previous page" }}
      />
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader><CardTitle>Client & service</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormGrid>
                  <ComboboxField control={form.control} name="clientId" label="Client" required options={lookups.clientOptions} searchPlaceholder="Search clients…" />
                  <ComboboxField control={form.control} name="vendorId" label="Vendor" options={vendorOptions} disabled={!clientId} description={clientId ? "Only this client's vendors are listed" : "Select a client first"} />
                  <SelectField control={form.control} name="serviceId" label="Service requested" required options={lookups.typeOptions} />
                  <DateField control={form.control} name="requiredBy" label="Required by" required />
                </FormGrid>
                <TextField control={form.control} name="title" label="Project name" required placeholder="e.g. Reactor R-201 — third-party inspection" />
                <CreatableMultiSelectField control={form.control} name="requiredSkills" label="Required inspector skills" options={lookups.skillOptions} placeholder="Select or add skills" onCreate={(s) => addSkill.mutate(s)} description="Used to match inspectors" />
                <TextareaField control={form.control} name="description" label="Scope / notes" rows={3} placeholder="Items, standards, quantity, access requirements…" />
                <SelectField control={form.control} name="coordinatorId" label="Coordinator" required options={lookups.coordinatorOptions} className="sm:max-w-sm" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Project site</CardTitle>
                <CardDescription>Where the inspection takes place</CardDescription>
                <CardAction className="flex gap-1">
                  <Button type="button" size="sm" variant="ghost" disabled={!clientId} onClick={() => copyAddress("client")}><Copy /> Client</Button>
                  <Button type="button" size="sm" variant="ghost" disabled={vendorId === NONE} onClick={() => copyAddress("vendor")}><Copy /> Vendor</Button>
                </CardAction>
              </CardHeader>
              <CardContent><AddressFields control={form.control} setValue={form.setValue} name="site" lineLabel="Site address" showMap={false} /></CardContent>
            </Card>
          </div>

          <div className="min-w-0 space-y-6">
            <Card className="gap-3">
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="size-4 text-primary-text" aria-hidden /> Site location</CardTitle></CardHeader>
              <CardContent><MapPreview address={site} height="h-64" /></CardContent>
            </Card>
          {!initial && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users className="size-4 text-primary-text" aria-hidden /> Nearby inspectors</CardTitle>
                  <CardDescription>Select inspectors to email for availability & confirmation when the inquiry is saved. You can also do this later.</CardDescription>
                </CardHeader>
                <CardContent>
                  <InspectorMatches site={site?.city ? site : null} skills={skills ?? []} selected={selected} onSelectedChange={setSelected} />
                </CardContent>
              </Card>
          )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border sm:bg-card xl:col-span-2">
            {!initial && <p className="mr-auto text-sm text-muted-foreground">{selected.size ? `${selected.size} inspector(s) will receive an availability email` : "No inspectors selected — saved as an inquiry"}</p>}
            <Button type="button" variant="outline" onClick={() => navigate(back)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : !initial && selected.size ? <Send /> : null}
              {initial ? "Save changes" : selected.size ? `Create & request ${selected.size}` : "Create inquiry"}
            </Button>
          </div>
        </form>
      </Form>
    </PageContainer>
  )
}
