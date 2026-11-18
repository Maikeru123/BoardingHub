import { MapPin } from "lucide-react"
import { address } from "@/lib/format"

type Location = {
  street?: string | null
  barangay?: string | null
  city_municipality?: string | null
  province?: string | null
  postal_code?: string | null
  latitude?: number | null
  longitude?: number | null
}

function validCoordinates(location: Location) {
  const latitude = location.latitude
  const longitude = location.longitude
  return typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
    ? { latitude, longitude }
    : null
}

export function LocationDisplay({ location }: { location: Location }) {
  const formatted = address(location)
  const coordinates = validCoordinates(location)
  const searchUrl = formatted
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(formatted)}`
    : null
  let embedUrl: string | null = null
  if (coordinates) {
    const offset = 0.008
    const { latitude, longitude } = coordinates
    const parameters = new URLSearchParams({
      bbox: [
        longitude - offset,
        latitude - offset,
        longitude + offset,
        latitude + offset,
      ].join(","),
      layer: "mapnik",
      marker: `${latitude},${longitude}`,
    })
    embedUrl = `https://www.openstreetmap.org/export/embed.html?${parameters}`
  }
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{formatted || "Address not provided"}</span>
      </p>
      {embedUrl ? (
        <div className="overflow-hidden rounded-xl border bg-muted">
          <iframe
            title={`Map showing ${formatted || "boarding house location"}`}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="h-72 w-full border-0"
          />
          <p className="border-t bg-card px-3 py-2 text-[11px] text-muted-foreground">
            Map data ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              OpenStreetMap contributors
            </a>
          </p>
        </div>
      ) : (
        searchUrl && (
          <p className="text-xs text-muted-foreground">
            An exact map pin is not available yet. The structured address is
            saved and map-ready.{" "}
            <a
              href={searchUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline"
            >
              Search this address on OpenStreetMap
            </a>
            .
          </p>
        )
      )}
    </div>
  )
}
