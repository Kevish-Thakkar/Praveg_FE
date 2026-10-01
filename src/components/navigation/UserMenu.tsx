import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ChevronDown, FlaskConical, LogOut, RotateCcw, UserRound, Users } from "@/components/icons"
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/common/UserAvatar"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { useCurrentUser, useSessionStore } from "@/store/session.store"
import { useDemoStore } from "@/store/demo.store"
import { resetDatabase } from "@/mock/db"
import { authService } from "@/services"
import { ROLES, type Role } from "@/types/domain"

export function UserMenu() {
  const user = useCurrentUser()
  const signIn = useSessionStore((s) => s.signIn)
  const signOut = useSessionStore((s) => s.signOut)
  const simulateErrors = useDemoStore((s) => s.simulateErrors)
  const setSimulateErrors = useDemoStore((s) => s.setSimulateErrors)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)

  const switchRole = async (role: string) => {
    try {
      const u = await authService.demoUserFor(role as Role)
      signIn(u)
      qc.clear()
      navigate("/dashboard")
      toast.success(`Now viewing as ${u.name} (${u.role})`)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-1.5 sm:px-2" aria-label="Account menu">
            <UserAvatar name={user.name} />
            <span className="hidden text-left leading-tight lg:block">
              <span className="block text-sm font-medium">{user.name}</span>
              <span className="block text-xs text-muted-foreground">{user.role}</span>
            </span>
            <ChevronDown className="hidden text-muted-foreground lg:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate("/profile")}>
            <UserRound /> My profile
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Users /> Switch role (demo)
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={user.role} onValueChange={(v) => void switchRole(v)}>
                {ROLES.map((r) => (
                  <DropdownMenuRadioItem key={r} value={r}>
                    {r}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Prototype controls</DropdownMenuLabel>
          <DropdownMenuCheckboxItem checked={simulateErrors} onCheckedChange={(v) => { setSimulateErrors(!!v); void qc.invalidateQueries(); if (v) toast.warning("API error simulation on — every request will fail") }}>
            <FlaskConical className="mr-2 size-4 text-muted-foreground" /> Simulate API errors
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
            <RotateCcw /> Reset demo data
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { signOut(); qc.clear(); navigate("/login") }}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset demo data?"
        description="All changes made in this browser (new projects, quotations, emails, uploads) will be discarded and the original sample data restored."
        confirmLabel="Reset data"
        destructive
        onConfirm={() => {
          resetDatabase()
          qc.clear()
          setConfirmReset(false)
          navigate("/dashboard")
          toast.success("Demo data restored")
        }}
      />
    </>
  )
}
