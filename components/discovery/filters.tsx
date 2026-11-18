"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/combobox"
import type { Amenity } from "@/types/domain"
import type { BoardingHouseFilters } from "@/lib/data/boarding-houses"

type LocationResponse = { locations?: ComboboxOption[] }

async function fetchLocations(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  const body = (await response.json()) as LocationResponse
  if (!response.ok || !body.locations) throw new Error("Location unavailable")
  return body.locations
}

function FilterForm({
  amenities,
  values,
  prefix,
}: {
  amenities: Amenity[]
  values: BoardingHouseFilters
  prefix: string
}) {
  const [province, setProvince] = useState(values.province || "")
  const [city, setCity] = useState(values.city || "")
  const [barangay, setBarangay] = useState(values.barangay || "")
  const [provinces, setProvinces] = useState<ComboboxOption[]>([])
  const [cities, setCities] = useState<ComboboxOption[]>([])
  const [barangays, setBarangays] = useState<ComboboxOption[]>([])
  const [loading, setLoading] = useState({
    province: true,
    city: Boolean(values.province),
    barangay: Boolean(values.province && values.city),
  })
  const [locationError, setLocationError] = useState({
    province: "",
    city: "",
    barangay: "",
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchLocations("/api/locations?level=provinces", controller.signal)
      .then(setProvinces)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLocationError((state) => ({
          ...state,
          province: "Unable to load provinces. Try again shortly.",
        }))
      })
      .finally(() => setLoading((state) => ({ ...state, province: false })))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!province) return
    const controller = new AbortController()
    fetchLocations(
      `/api/locations?level=cities-municipalities&province=${encodeURIComponent(province)}`,
      controller.signal
    )
      .then(setCities)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLocationError((state) => ({
          ...state,
          city: "Unable to load cities and municipalities.",
        }))
      })
      .finally(() => setLoading((state) => ({ ...state, city: false })))
    return () => controller.abort()
  }, [province])

  useEffect(() => {
    if (!province || !city) return
    const controller = new AbortController()
    fetchLocations(
      `/api/locations?level=barangays&province=${encodeURIComponent(province)}&cityMunicipality=${encodeURIComponent(city)}`,
      controller.signal
    )
      .then(setBarangays)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setLocationError((state) => ({
          ...state,
          barangay: "Unable to load barangays.",
        }))
      })
      .finally(() => setLoading((state) => ({ ...state, barangay: false })))
    return () => controller.abort()
  }, [province, city])

  return (
    <form action="/boarding-houses" className="space-y-5">
      {values.search && (
        <input type="hidden" name="search" value={values.search} />
      )}
      <input type="hidden" name="province" value={province} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="barangay" value={barangay} />
      <SearchableCombobox
        label="Province"
        placeholder="All provinces"
        searchPlaceholder="Search provinces"
        value={province}
        options={provinces}
        loading={loading.province}
        error={locationError.province}
        onValueChange={(option) => {
          setProvince(option?.code || "")
          setCity("")
          setBarangay("")
          setCities([])
          setBarangays([])
          setLocationError((state) => ({ ...state, city: "", barangay: "" }))
          setLoading((state) => ({
            ...state,
            city: Boolean(option),
            barangay: false,
          }))
        }}
      />
      <SearchableCombobox
        label="City / municipality"
        placeholder={province ? "All cities" : "Choose a province first"}
        searchPlaceholder="Search cities and municipalities"
        value={city}
        options={cities}
        loading={loading.city}
        error={locationError.city}
        disabled={!province}
        onValueChange={(option) => {
          setCity(option?.code || "")
          setBarangay("")
          setBarangays([])
          setLocationError((state) => ({ ...state, barangay: "" }))
          setLoading((state) => ({ ...state, barangay: Boolean(option) }))
        }}
      />
      <SearchableCombobox
        label="Barangay"
        placeholder={city ? "All barangays" : "Choose a city first"}
        searchPlaceholder="Search barangays"
        value={barangay}
        options={barangays}
        loading={loading.barangay}
        error={locationError.barangay}
        disabled={!city}
        onValueChange={(option) => setBarangay(option?.code || "")}
      />
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-min-price`}>Minimum rent</Label>
          <Input
            id={`${prefix}-min-price`}
            name="minPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={values.minPrice}
            placeholder="₱0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-max-price`}>Maximum rent</Label>
          <Input
            id={`${prefix}-max-price`}
            name="maxPrice"
            type="number"
            min="0"
            step="100"
            defaultValue={values.maxPrice}
            placeholder="Any"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-room-type`}>Room type</Label>
        <select
          id={`${prefix}-room-type`}
          name="roomType"
          defaultValue={values.roomType || ""}
          className="form-select"
        >
          <option value="">All room types</option>
          <option value="single">Single</option>
          <option value="shared">Shared</option>
          <option value="bed_space">Bed space</option>
          <option value="studio">Studio</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-capacity`}>Minimum capacity</Label>
        <Input
          id={`${prefix}-capacity`}
          name="capacity"
          type="number"
          min="1"
          max="100"
          defaultValue={values.capacity}
          placeholder="Any capacity"
        />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="available"
          value="true"
          defaultChecked={values.available === "true"}
          className="size-4 rounded border-input accent-primary"
        />
        Show properties with available rooms
      </label>
      <Separator />
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Amenities</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {amenities.map((amenity) => (
            <label
              key={amenity.id}
              className="flex items-center gap-3 text-sm text-muted-foreground"
            >
              <input
                type="checkbox"
                name="amenities"
                value={amenity.id}
                defaultChecked={values.amenities?.includes(amenity.id)}
                className="size-4 rounded border-input accent-primary"
              />
              {amenity.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button type="submit">Apply filters</Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/boarding-houses" />}
        >
          Clear all
        </Button>
      </div>
    </form>
  )
}

export function DiscoveryFilters({
  amenities,
  values,
}: {
  amenities: Amenity[]
  values: BoardingHouseFilters
}) {
  return (
    <>
      <aside className="hidden rounded-xl border bg-card p-5 lg:block">
        <div className="mb-5 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-primary" />
          <h2 className="font-semibold">Filter your search</h2>
        </div>
        <FilterForm amenities={amenities} values={values} prefix="desktop" />
      </aside>
      <Sheet>
        <SheetTrigger
          render={<Button variant="outline" className="lg:hidden" />}
        >
          <SlidersHorizontal /> Filters
        </SheetTrigger>
        <SheetContent className="w-full! overflow-y-auto sm:max-w-md!">
          <SheetHeader>
            <SheetTitle>Filter boarding houses</SheetTitle>
            <SheetDescription>
              Narrow results by location, price, room, and amenities.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterForm amenities={amenities} values={values} prefix="mobile" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
