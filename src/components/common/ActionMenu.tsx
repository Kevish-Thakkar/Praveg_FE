import type { AppIcon } from "@/components/icons"
import { MoreHorizontal } from "@/components/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface ActionItemDef {
  label: string
  icon?: AppIcon
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
  hidden?: boolean
  separatorBefore?: boolean
}

export function ActionMenu({ items, label = "More actions" }: { items: ActionItemDef[]; label?: string }) {
  const visible = items.filter((i) => !i.hidden)
  if (!visible.length) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={label} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
        {visible.map((item) => (
          <div key={item.label}>
            {item.separatorBefore && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={item.onSelect} disabled={item.disabled} variant={item.destructive ? "destructive" : "default"}>
              {item.icon && <item.icon />}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
