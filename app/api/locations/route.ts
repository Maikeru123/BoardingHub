import {
  getPhilippineBarangays,
  getPhilippineCitiesMunicipalities,
  getPhilippineProvinces,
  PhilippineLocationError,
} from "@/lib/locations/philippines"

const codePattern = /^\d{10}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get("level")
  const provinceCode = searchParams.get("province") || ""
  const cityMunicipalityCode = searchParams.get("cityMunicipality") || ""
  try {
    let locations
    if (level === "provinces") {
      locations = await getPhilippineProvinces()
    } else if (level === "cities-municipalities") {
      if (!codePattern.test(provinceCode))
        return Response.json({ error: "Invalid province." }, { status: 400 })
      locations = await getPhilippineCitiesMunicipalities(provinceCode)
    } else if (level === "barangays") {
      if (
        !codePattern.test(provinceCode) ||
        !codePattern.test(cityMunicipalityCode)
      )
        return Response.json(
          { error: "Invalid parent location." },
          { status: 400 }
        )
      locations = await getPhilippineBarangays(
        provinceCode,
        cityMunicipalityCode
      )
    } else {
      return Response.json(
        { error: "Invalid location level." },
        { status: 400 }
      )
    }
    return Response.json(
      { locations },
      {
        headers: {
          "Cache-Control":
            "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    )
  } catch (error) {
    if (!(error instanceof PhilippineLocationError))
      console.error("Unexpected Philippine location lookup failure", error)
    return Response.json(
      { error: "Philippine location data is temporarily unavailable." },
      { status: 503 }
    )
  }
}
