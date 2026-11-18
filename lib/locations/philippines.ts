import "server-only"

import { philippines, type PsgcSummary } from "@ianlabicani/geoph-lite"

const METRO_MANILA_CODE = "1300000000"
const BARMM_SPECIAL_GEOGRAPHIC_AREA_CODE = "1900000000"

// Independent/highly urbanized cities have region-level PSGC parentage. The
// product's Province-first form groups them under their commonly associated
// host province while retaining their official locality and barangay codes.
const independentLocalityHostProvince: Record<string, string> = {
  "1430300000": "1401100000", // Baguio -> Benguet
  "0330100000": "0305400000", // Angeles -> Pampanga
  "0331400000": "0307100000", // Olongapo -> Zambales
  "0431200000": "0405600000", // Lucena -> Quezon
  "1731500000": "1705300000", // Puerto Princesa -> Palawan
  "0631000000": "0603000000", // Iloilo City -> Iloilo
  "1830200000": "1804500000", // Bacolod -> Negros Occidental
  "0730600000": "0702200000", // Cebu City -> Cebu
  "0731100000": "0702200000", // Lapu-Lapu -> Cebu
  "0731300000": "0702200000", // Mandaue -> Cebu
  "0831600000": "0803700000", // Tacloban -> Leyte
  "0990101000": "1900700000", // Isabela City -> Basilan
  "0931700000": "0907300000", // Zamboanga City -> Zamboanga del Sur
  "1030500000": "1004300000", // Cagayan de Oro -> Misamis Oriental
  "1030900000": "1003500000", // Iligan -> Lanao del Norte
  "1130700000": "1102400000", // Davao City -> Davao del Sur
  "1230800000": "1206300000", // General Santos -> South Cotabato
  "1630400000": "1600200000", // Butuan -> Agusan del Norte
}

export type PhilippineLocation = {
  code: string
  name: string
}

export class PhilippineLocationError extends Error {
  constructor(
    message = "Philippine location data is temporarily unavailable."
  ) {
    super(message)
    this.name = "PhilippineLocationError"
  }
}

function toLocation({ psgc_code, name }: PsgcSummary): PhilippineLocation {
  return { code: psgc_code, name }
}

function locationSort(a: PhilippineLocation, b: PhilippineLocation) {
  return a.name.localeCompare(b.name, "en-PH")
}

let provincesPromise: Promise<PhilippineLocation[]> | undefined
let independentLocalitiesPromise: Promise<PsgcSummary[]> | undefined

async function loadProvinces() {
  const regionList = philippines.regions()
  const provinceGroups = await Promise.all(
    regionList.map((region) => philippines.provinces(region.psgc_code))
  )
  return [
    ...provinceGroups.flat().map(toLocation),
    { code: METRO_MANILA_CODE, name: "Metro Manila (NCR)" },
    {
      code: BARMM_SPECIAL_GEOGRAPHIC_AREA_CODE,
      name: "BARMM Special Geographic Area",
    },
  ].sort(locationSort)
}

async function loadIndependentLocalities() {
  const groups = await Promise.all(
    philippines
      .regions()
      .filter(
        ({ psgc_code }) =>
          psgc_code !== METRO_MANILA_CODE &&
          psgc_code !== BARMM_SPECIAL_GEOGRAPHIC_AREA_CODE
      )
      .map(({ psgc_code }) => philippines.localities(psgc_code))
  )
  return groups.flat()
}

export async function getPhilippineProvinces(): Promise<PhilippineLocation[]> {
  try {
    provincesPromise ??= loadProvinces()
    return await provincesPromise
  } catch {
    provincesPromise = undefined
    throw new PhilippineLocationError()
  }
}

export async function getPhilippineCitiesMunicipalities(
  provinceCode: string
): Promise<PhilippineLocation[]> {
  const province = (await getPhilippineProvinces()).find(
    (item) => item.code === provinceCode
  )
  if (!province) return []
  try {
    if (
      provinceCode === METRO_MANILA_CODE ||
      provinceCode === BARMM_SPECIAL_GEOGRAPHIC_AREA_CODE
    ) {
      return (await philippines.localities(provinceCode))
        .map(toLocation)
        .sort(locationSort)
    }
    independentLocalitiesPromise ??= loadIndependentLocalities()
    const [provinceLocalities, independentLocalities] = await Promise.all([
      philippines.localities(provinceCode),
      independentLocalitiesPromise,
    ])
    return [
      ...provinceLocalities,
      ...independentLocalities.filter(
        (item) =>
          independentLocalityHostProvince[item.psgc_code] === provinceCode
      ),
    ]
      .map(toLocation)
      .sort(locationSort)
  } catch {
    independentLocalitiesPromise = undefined
    throw new PhilippineLocationError()
  }
}

export async function getPhilippineBarangays(
  provinceCode: string,
  cityMunicipalityCode: string
): Promise<PhilippineLocation[]> {
  const locality = (await getPhilippineCitiesMunicipalities(provinceCode)).find(
    (item) => item.code === cityMunicipalityCode
  )
  if (!locality) return []
  try {
    return (await philippines.barangays(locality.code))
      .map(toLocation)
      .sort(locationSort)
  } catch {
    throw new PhilippineLocationError()
  }
}

export async function resolvePhilippineAddressCodes(input: {
  provinceCode: string
  cityMunicipalityCode: string
  barangayCode: string
}) {
  const province = (await getPhilippineProvinces()).find(
    (item) => item.code === input.provinceCode
  )
  if (!province) return null
  const cityMunicipality = (
    await getPhilippineCitiesMunicipalities(province.code)
  ).find((item) => item.code === input.cityMunicipalityCode)
  if (!cityMunicipality) return null
  const barangay = (
    await getPhilippineBarangays(province.code, cityMunicipality.code)
  ).find((item) => item.code === input.barangayCode)
  if (!barangay) return null
  return { province, cityMunicipality, barangay }
}
