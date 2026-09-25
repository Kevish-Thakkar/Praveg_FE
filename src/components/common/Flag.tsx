import { cn } from "@/lib/utils"
import type { Country } from "@/types/domain"

/**
 * Inline SVG flags. Emoji flags are not used because Windows renders them as letters ("IN", "AE").
 * Simplified for icon size (the Ashoka Chakra is drawn as a ring without spokes).
 */
export function Flag({ country, className }: { country: Country; className?: string }) {
  const label = country === "India" ? "India" : "United Arab Emirates"
  return (
    <svg viewBox="0 0 30 20" role="img" aria-label={label} className={cn("h-3.5 w-[21px] shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10", className)}>
      {country === "India" ? (
        <>
          <rect width="30" height="6.67" fill="#FF9933" />
          <rect y="6.67" width="30" height="6.66" fill="#FFFFFF" />
          <rect y="13.33" width="30" height="6.67" fill="#138808" />
          <circle cx="15" cy="10" r="2.4" fill="none" stroke="#000080" strokeWidth="0.8" />
          <circle cx="15" cy="10" r="0.6" fill="#000080" />
        </>
      ) : (
        <>
          <rect width="30" height="6.67" fill="#00732F" />
          <rect y="6.67" width="30" height="6.66" fill="#FFFFFF" />
          <rect y="13.33" width="30" height="6.67" fill="#000000" />
          <rect width="7.5" height="20" fill="#FF0000" />
        </>
      )}
    </svg>
  )
}
