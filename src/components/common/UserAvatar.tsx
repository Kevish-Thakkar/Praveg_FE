import { memo } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export const UserAvatar = memo(function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className="bg-primary-soft text-xs font-semibold text-primary-text">{initials(name)}</AvatarFallback>
    </Avatar>
  )
})
