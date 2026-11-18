export const currency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount)
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(new Date(value))
    : "—"
export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
export const address = (house: {
  street?: string | null
  barangay?: string | null
  city_municipality?: string | null
  province?: string | null
  postal_code?: string | null
}) =>
  [
    house.street,
    house.barangay,
    house.city_municipality,
    house.province,
    house.postal_code,
  ]
    .filter(Boolean)
    .join(", ")
