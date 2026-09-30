import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, FileCheck2, KeyRound, MapPin, Send, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { TextField } from "@/components/forms/fields"
import { Spinner } from "@/components/feedback/LoadingState"
import { authService, DEMO_OTP } from "@/services"
import { useSessionStore } from "@/store/session.store"
import { users } from "@/mock/seed/masters"
import { BrandLogo } from "@/components/common/BrandLogo"

const emailSchema = z.object({ email: z.email("Enter a valid email address") })
type EmailForm = z.infer<typeof emailSchema>

const DEMO_ACCOUNTS = users.filter((u) => u.status === "Active" && ["usr_001", "usr_002", "usr_006"].includes(u.id))

type Step = { kind: "email" } | { kind: "otp"; email: string; masked: string; expires: number }

export function LoginPage() {
  const user = useSessionStore((s) => s.user)
  const signIn = useSessionStore((s) => s.signIn)
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState<Step>({ kind: "email" })
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(0)

  const form = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } })

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  if (user) return <Navigate to={(location.state as { from?: string } | null)?.from ?? "/dashboard"} replace />

  const requestOtp = async (email: string) => {
    setError(null)
    setSending(true)
    try {
      const r = await authService.requestOtp(email)
      setStep({ kind: "otp", email, masked: r.maskedEmail, expires: r.expiresInMinutes })
      setCode("")
      setCooldown(30)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const verify = async (value: string) => {
    if (step.kind !== "otp" || value.length !== 6) return
    setError(null)
    setVerifying(true)
    try {
      const u = await authService.verifyOtp(step.email, value)
      signIn(u)
      navigate("/dashboard", { replace: true })
    } catch (e) {
      setError((e as Error).message)
      setCode("")
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-brand-gradient text-white">
      <div className="bg-grid-white pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden />
      <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-sky-300/30 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[28rem] rounded-full bg-indigo-400/30 blur-3xl" aria-hidden />

      <div className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1.1fr_minmax(0,460px)] lg:gap-16">
        <aside className="hidden flex-col gap-10 lg:flex">
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white p-1.5 ring-4 ring-white/20">
              <BrandLogo variant="mark" className="size-full" />
            </span>
            <div>
              <p className="text-xl font-bold tracking-wide">PRAVEG</p>
              <p className="text-sm text-white/75">Certification Services</p>
            </div>
          </div>
          <div className="max-w-xl space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 ring-1 ring-white/20 uppercase">
              Operations Management Platform
            </p>
            <h1 className="text-4xl leading-tight font-semibold xl:text-5xl">From inquiry to invoice — every inspection job in one place.</h1>
            <p className="max-w-lg text-base text-white/80">Find nearby inspectors, send CVs to clients, schedule jobs with automatic reminders, and track payments without leaving the platform.</p>
          </div>

          {/* Illustration: a live job card moving through the flow */}
          <div className="relative max-w-lg" aria-hidden>
            <div className="animate-float rounded-2xl bg-white/95 p-5 text-foreground ring-1 ring-white/40 backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">PRJ-2026-014 · Hazira, Gujarat</p>
                  <p className="font-semibold">Third-party inspection — pressure vessels</p>
                </div>
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-xs font-medium text-info">Job scheduled</span>
              </div>
              <ol className="mt-4 grid grid-cols-6 gap-1.5">
                {[MapPin, Send, FileCheck2, UserCheck, CalendarClock, CheckCircle2].map((Icon, i) => (
                  <li key={i} className="flex flex-col items-center gap-1.5">
                    <span className={`flex size-8 items-center justify-center rounded-full ${i < 4 ? "bg-primary-dark text-white" : i === 4 ? "bg-card text-primary-strong ring-2 ring-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className={`h-1 w-full rounded-full ${i < 4 ? "bg-primary-dark" : "bg-muted"}`} />
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs">
                <span className="text-muted-foreground">Reminder to Imran Shaikh</span>
                <span className="font-medium text-primary-text">Automatic · tomorrow 09:00</span>
              </div>
            </div>
            <div className="absolute -right-6 -bottom-8 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-foreground shadow-lg shadow-black/10">
              <span className="flex size-6 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-3.5" /></span>
              3 inspectors within 40 km
            </div>
          </div>
          <p className="text-xs text-white/60">India · United Arab Emirates · Interactive prototype with sample data</p>
        </aside>

        <main className="mx-auto w-full max-w-md space-y-5">
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <span className="flex size-20 items-center justify-center rounded-3xl bg-white p-2 ring-4 ring-white/20">
              <BrandLogo variant="mark" className="size-full" />
            </span>
            <p className="text-center text-sm text-white/80">Praveg Operations Management Platform</p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-foreground shadow-2xl shadow-black/20 sm:p-8">
            {step.kind === "email" ? (
              <>
                <div className="mb-6 space-y-1.5">
                  <h2 className="text-2xl font-semibold">Welcome back</h2>
                  <p className="text-sm text-muted-foreground">Sign in with a one-time password sent to your work email.</p>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((v) => requestOtp(v.email))} className="space-y-4" noValidate>
                    <TextField control={form.control} name="email" label="Work email" type="email" autoComplete="email" placeholder="name@praveg.com" required />
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" size="lg" className="w-full" disabled={sending}>
                      {sending ? <Spinner /> : <KeyRound />}
                      Send one-time password
                    </Button>
                  </form>
                </Form>
                <p className="mt-4 text-xs text-muted-foreground">Super Admin accounts must use an organization email domain.</p>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setStep({ kind: "email" }); setError(null) }} className="mb-4 inline-flex items-center gap-1 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <ArrowLeft className="size-4" /> Use a different email
                </button>
                <div className="mb-6 space-y-1.5">
                  <h2 className="text-2xl font-semibold">Enter your code</h2>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <span className="font-medium text-foreground">{step.masked}</span>. It expires in {step.expires} minutes.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">One-time password</Label>
                    <InputOTP id="otp" maxLength={6} value={code} onChange={setCode} onComplete={verify} disabled={verifying} autoFocus inputMode="numeric">
                      <InputOTPGroup className="w-full justify-between *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:flex-1 *:data-[slot=input-otp-slot]:text-lg">
                        {Array.from({ length: 6 }, (_, i) => <InputOTPSlot key={i} index={i} />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button size="lg" className="w-full" disabled={code.length !== 6 || verifying} onClick={() => void verify(code)}>
                    {verifying && <Spinner />} Verify and sign in
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Didn't get it?</span>
                    <Button variant="link" size="sm" className="h-auto p-0" disabled={cooldown > 0 || sending} onClick={() => void requestOtp(step.email)}>
                      {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                    </Button>
                  </div>
                  <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info">Prototype: use code <span className="font-mono font-semibold">{DEMO_OTP}</span></p>
                </div>
              </>
            )}
          </div>

          {step.kind === "email" && (
            <section aria-labelledby="demo-accounts" className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
              <h3 id="demo-accounts" className="mb-3 text-xs font-semibold tracking-wide text-white/80 uppercase">Try a demo account</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { form.setValue("email", u.email); void requestOtp(u.email) }}
                    className="group flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-foreground transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:flex-col sm:items-start"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{u.role}</span>
                      <span className="block truncate text-xs text-muted-foreground">{u.name}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-primary-text transition group-hover:translate-x-0.5 sm:hidden" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
