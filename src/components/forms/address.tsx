import { useEffect, useMemo, useState } from "react"
import { useWatch, type Control, type FieldValues, type Path, type UseFormSetValue } from "react-hook-form"
import { z } from "zod"
import { ExternalLink, MapPin } from "@/components/icons"
import { CITY_COORDS, COUNTRIES, STATES, formatAddress, geocode, mapEmbedUrl } from "@/constants/geo"
import { ComboboxCreatableField, FormGrid, SelectField, TextField, TextareaField } from "./fields"
import type { Address, Country } from "@/types/domain"
import { cn } from "@/lib/utils"

/** Name, address, email, state and city are mandatory on every master form (v2). */
export const addressSchema = z.object({
  line: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.enum(["India", "United Arab Emirates"], { message: "Select a country" }),
  lat: z.number(),
  lng: z.number(),
})

export const emptyAddress = (country: Country = "India"): Address => ({ line: "", city: "", state: "", country, lat: 0, lng: 0 })

interface Props<T extends FieldValues> {
  control: Control<T>
  setValue: UseFormSetValue<T>
  /** path of the address object in the form, e.g. "address" or "site" */
  name: Path<T>
  lineLabel?: string
  showMap?: boolean
  /** dense layout for drawers and dialogs: one-line address, country/state/city in one row, small map below */
  compact?: boolean
}

/**
 * Address block: line, country, state (by country), city (known cities + free text) and a Google Maps preview.
 * Prototype geocoding is approximate (city centre); production uses Google Places Autocomplete.
 */
export function AddressFields<T extends FieldValues>({ control, setValue, name, lineLabel = "Address", showMap = true, compact = false }: Props<T>) {
  const p = (k: keyof Address) => `${name}.${k}` as Path<T>
  const value = useWatch({ control, name }) as Address | undefined
  const country = value?.country ?? "India"
  const state = value?.state ?? ""
  const city = value?.city ?? ""

  const cityOptions = useMemo(
    () => Object.entries(CITY_COORDS).filter(([, c]) => c.country === country && (!state || c.state === state)).map(([n]) => ({ value: n, label: n })),
    [country, state],
  )

  // keep coordinates in sync with city/state (mock geocoder)
  useEffect(() => {
    if (!city && !state) return
    const g = geocode(city, state, country)
    if (g.lat !== value?.lat || g.lng !== value?.lng) {
      setValue(p("lat"), g.lat as never, { shouldDirty: false })
      setValue(p("lng"), g.lng as never, { shouldDirty: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, state, country])

  const onCountryChange = (c: Country) => {
    if (c === country) return
    setValue(p("state"), "" as never)
    setValue(p("city"), "" as never)
  }

  const fields = (
    <div className="min-w-0 space-y-4">
      <TextareaField control={control} name={p("line")} label={lineLabel} required rows={2} placeholder="Plot / building, street, area" />
      <FormGrid className="sm:grid-cols-1 @4xl:grid-cols-3">
        <SelectField control={control} name={p("country")} label="Country" required options={COUNTRIES} onValueChange={(v) => onCountryChange(v as Country)} />
        <SelectField control={control} name={p("state")} label={country === "India" ? "State" : "Emirate"} required options={STATES[country]} onValueChange={() => setValue(p("city"), "" as never)} />
        <ComboboxCreatableField control={control} name={p("city")} label="City" required options={cityOptions} placeholder="Select or type" onCreateHint="Use" />
      </FormGrid>
    </div>
  )
  if (compact) {
    return (
      <div className="space-y-3">
        <TextField control={control} name={p("line")} label={lineLabel} required placeholder="Plot / building, street, area" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SelectField control={control} name={p("country")} label="Country" required options={COUNTRIES} onValueChange={(v) => onCountryChange(v as Country)} />
          <SelectField control={control} name={p("state")} label={country === "India" ? "State" : "Emirate"} required options={STATES[country]} onValueChange={() => setValue(p("city"), "" as never)} />
          <ComboboxCreatableField control={control} name={p("city")} label="City" required options={cityOptions} placeholder="Select or type" onCreateHint="Use" />
        </div>
        {showMap && <MapPreview address={value} height="h-28" />}
      </div>
    )
  }
  if (!showMap) return fields
  // Map sits to the right of the fields whenever the container is wide enough; stacks below on narrow screens.
  return (
    <div className="@container">
      <div className="grid gap-4 @lg:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] @4xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {fields}
        <MapPreview address={value} fill className="min-h-56 @lg:mt-[22px]" />
      </div>
    </div>
  )
}

export function MapPreview({ address, className, height = "h-44", fill }: { address?: Partial<Address> | null; className?: string; height?: string; fill?: boolean }) {
  const [failed, setFailed] = useState(false)
  const ready = !!address?.city && !!address?.state
  const q = ready ? formatAddress({ line: address!.line ?? "", city: address!.city!, state: address!.state!, country: address!.country ?? "" }) : ""
  const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-muted", fill && "flex flex-col", className)}>
      {ready && !failed ? (
        <iframe title={`Map of ${q}`} src={mapEmbedUrl(q)} className={cn("w-full border-0", fill ? "min-h-44 flex-1" : height)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" onError={() => setFailed(true)} />
      ) : (
        <div className={cn("flex flex-col items-center justify-center gap-1 px-4 text-center text-xs text-muted-foreground", fill ? "min-h-44 flex-1" : height)}>
          <MapPin className="size-6 text-primary/60" aria-hidden />
          {ready ? "Map preview unavailable" : "Select state and city to see the location"}
        </div>
      )}
      {ready && (
        <div className="flex items-center justify-between gap-2 border-t bg-card px-3 py-1.5 text-xs">
          <span className="truncate text-muted-foreground">{q}</span>
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-primary-text hover:underline">
            Open in Google Maps <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      )}
    </div>
  )
}
