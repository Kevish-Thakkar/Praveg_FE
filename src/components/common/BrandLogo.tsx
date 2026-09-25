import { cn } from "@/lib/utils"
import markSrc from "@/assets/brand/praveg-mark.png"
import logoSrc from "@/assets/brand/praveg-logo.png"
import wordmarkSrc from "@/assets/brand/praveg-wordmark.png"

/**
 * Praveg Certification Services logo, supplied by the client (public/Photo.png).
 * The artwork has a white background, so it's only placed on white / card surfaces.
 */
type Variant = "mark" | "full" | "wordmark"

const SRC: Record<Variant, string> = { mark: markSrc, full: logoSrc, wordmark: wordmarkSrc }

export function BrandLogo({ variant = "mark", className, decorative }: { variant?: Variant; className?: string; decorative?: boolean }) {
  return (
    <img
      src={SRC[variant]}
      alt={decorative ? "" : "Praveg Certification Services"}
      aria-hidden={decorative || undefined}
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  )
}
