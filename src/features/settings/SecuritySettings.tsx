import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { FormGrid, NumberField, TextField } from "@/components/forms/fields"
import { Spinner, TableSkeleton } from "@/components/feedback/LoadingState"
import { usePermission } from "@/components/common/Can"
import { useSettings, useUpdateSettings } from "./hooks"

const schema = z.object({
  domains: z.string().trim().min(3, "At least one domain").refine((v) => v.split(",").every((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d.trim())), "Use comma-separated domains like praveg.com"),
  otpExpiryMinutes: z.number({ error: "Required" }).int().min(1).max(30),
  defaultGstRate: z.number({ error: "Required" }).min(0).max(28),
})
type V = z.infer<typeof schema>

export function SecuritySettings() {
  const q = useSettings()
  const update = useUpdateSettings()
  const canEdit = usePermission("settings", "edit")
  const form = useForm<V>({ resolver: zodResolver(schema) })
  useEffect(() => { if (q.data) form.reset({ domains: q.data.allowedAdminDomains.join(", "), otpExpiryMinutes: q.data.otpExpiryMinutes, defaultGstRate: q.data.defaultGstRate }) }, [q.data, form])
  if (q.isPending) return <Card><TableSkeleton rows={3} columns={2} /></Card>
  return (
    <Card>
      <CardHeader><CardTitle>Login & security</CardTitle><CardDescription>OTP-based login; administrative accounts restricted to organization email domains.</CardDescription></CardHeader>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit((v) => update.mutate({ allowedAdminDomains: v.domains.split(",").map((d) => d.trim()), otpExpiryMinutes: v.otpExpiryMinutes, defaultGstRate: v.defaultGstRate }))}>
          <CardContent className="space-y-4">
            <TextField control={form.control} name="domains" label="Allowed admin email domains" required disabled={!canEdit} description="Comma-separated. Super Admin and Admin accounts outside these domains cannot sign in." />
            <FormGrid>
              <NumberField control={form.control} name="otpExpiryMinutes" label="OTP expiry (minutes)" required disabled={!canEdit} />
              <NumberField control={form.control} name="defaultGstRate" label="Default GST rate (%)" required disabled={!canEdit} />
            </FormGrid>
          </CardContent>
          {canEdit && <CardFooter className="mt-6 justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset()}>Reset</Button><Button type="submit" disabled={update.isPending}>{update.isPending && <Spinner />} Save settings</Button></CardFooter>}
        </form>
      </Form>
    </Card>
  )
}
