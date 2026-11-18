"use client"

import { useEffect, useState } from "react"
import { Controller, useWatch, type UseFormReturn } from "react-hook-form"
import {
  SearchableCombobox,
  type ComboboxOption,
} from "@/components/ui/combobox"
import type { HouseInput } from "@/lib/validation"

type LocationResponse = {
  locations?: ComboboxOption[]
  error?: string
}

async function loadLocations(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  const payload = (await response.json()) as LocationResponse
  if (!response.ok || !payload.locations)
    throw new Error(payload.error || "Unable to load locations.")
  return payload.locations
}

export function PhilippineAddressSelector({
  form,
}: {
  form: UseFormReturn<HouseInput>
}) {
  const provinceCode = useWatch({
    control: form.control,
    name: "province_code",
  })
  const cityMunicipalityCode = useWatch({
    control: form.control,
    name: "city_municipality_code",
  })
  const [provinces, setProvinces] = useState<ComboboxOption[]>([])
  const [citiesMunicipalities, setCitiesMunicipalities] = useState<
    ComboboxOption[]
  >([])
  const [barangays, setBarangays] = useState<ComboboxOption[]>([])
  const [loading, setLoading] = useState({
    provinces: true,
    citiesMunicipalities: Boolean(provinceCode),
    barangays: Boolean(provinceCode && cityMunicipalityCode),
  })
  const [errors, setErrors] = useState({
    provinces: "",
    citiesMunicipalities: "",
    barangays: "",
  })

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    loadLocations("/api/locations?level=provinces", controller.signal)
      .then((locations) => {
        if (!active) return
        setProvinces(locations)
        setErrors((state) => ({ ...state, provinces: "" }))
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setErrors((state) => ({
          ...state,
          provinces: "Unable to load provinces. Refresh and try again.",
        }))
      })
      .finally(() => {
        if (active) setLoading((state) => ({ ...state, provinces: false }))
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!provinceCode) return
    const controller = new AbortController()
    let active = true
    loadLocations(
      `/api/locations?level=cities-municipalities&province=${encodeURIComponent(provinceCode)}`,
      controller.signal
    )
      .then((locations) => {
        if (!active) return
        setCitiesMunicipalities(locations)
        setErrors((state) => ({ ...state, citiesMunicipalities: "" }))
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setErrors((state) => ({
          ...state,
          citiesMunicipalities:
            "Unable to load cities and municipalities. Try again.",
        }))
      })
      .finally(() => {
        if (active)
          setLoading((state) => ({ ...state, citiesMunicipalities: false }))
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [provinceCode])

  useEffect(() => {
    if (!provinceCode || !cityMunicipalityCode) return
    const controller = new AbortController()
    let active = true
    loadLocations(
      `/api/locations?level=barangays&province=${encodeURIComponent(provinceCode)}&cityMunicipality=${encodeURIComponent(cityMunicipalityCode)}`,
      controller.signal
    )
      .then((locations) => {
        if (!active) return
        setBarangays(locations)
        setErrors((state) => ({ ...state, barangays: "" }))
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof DOMException && error.name === "AbortError") return
        setErrors((state) => ({
          ...state,
          barangays: "Unable to load barangays. Try again.",
        }))
      })
      .finally(() => {
        if (active) setLoading((state) => ({ ...state, barangays: false }))
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [provinceCode, cityMunicipalityCode])

  return (
    <>
      <Controller
        control={form.control}
        name="province_code"
        render={({ field, fieldState }) => (
          <SearchableCombobox
            label="Province"
            placeholder="Search province…"
            searchPlaceholder="Type to filter provinces"
            value={field.value}
            options={provinces}
            loading={loading.provinces}
            disabled={loading.provinces || Boolean(errors.provinces)}
            error={fieldState.error?.message || errors.provinces}
            required
            onValueChange={(option) => {
              setCitiesMunicipalities([])
              setBarangays([])
              setErrors((state) => ({
                ...state,
                citiesMunicipalities: "",
                barangays: "",
              }))
              setLoading((state) => ({
                ...state,
                citiesMunicipalities: Boolean(option),
                barangays: false,
              }))
              field.onChange(option?.code || "")
              form.setValue("province", option?.name || "", {
                shouldValidate: true,
              })
              form.setValue("city_municipality_code", "")
              form.setValue("city_municipality", "")
              form.setValue("barangay_code", "")
              form.setValue("barangay", "")
            }}
          />
        )}
      />
      <Controller
        control={form.control}
        name="city_municipality_code"
        render={({ field, fieldState }) => (
          <SearchableCombobox
            label="City / municipality"
            placeholder={
              provinceCode
                ? "Search city or municipality…"
                : "Choose a province first"
            }
            searchPlaceholder="Type to filter cities and municipalities"
            value={field.value}
            options={citiesMunicipalities}
            loading={loading.citiesMunicipalities}
            disabled={
              !provinceCode ||
              loading.citiesMunicipalities ||
              Boolean(errors.citiesMunicipalities)
            }
            error={fieldState.error?.message || errors.citiesMunicipalities}
            required
            onValueChange={(option) => {
              setBarangays([])
              setErrors((state) => ({ ...state, barangays: "" }))
              setLoading((state) => ({
                ...state,
                barangays: Boolean(option),
              }))
              field.onChange(option?.code || "")
              form.setValue("city_municipality", option?.name || "", {
                shouldValidate: true,
              })
              form.setValue("barangay_code", "")
              form.setValue("barangay", "")
            }}
          />
        )}
      />
      <Controller
        control={form.control}
        name="barangay_code"
        render={({ field, fieldState }) => (
          <SearchableCombobox
            label="Barangay"
            placeholder={
              cityMunicipalityCode
                ? "Search barangay…"
                : "Choose a city or municipality first"
            }
            searchPlaceholder="Type to filter barangays"
            value={field.value}
            options={barangays}
            loading={loading.barangays}
            disabled={
              !cityMunicipalityCode ||
              loading.barangays ||
              Boolean(errors.barangays)
            }
            error={fieldState.error?.message || errors.barangays}
            required
            onValueChange={(option) => {
              field.onChange(option?.code || "")
              form.setValue("barangay", option?.name || "", {
                shouldValidate: true,
              })
            }}
          />
        )}
      />
    </>
  )
}
