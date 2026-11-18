import { Search } from "lucide-react"
import { PublicNavbar } from "@/components/public-navbar"
import { DashboardHeader, EmptyState, Pagination } from "@/components/shared"
import { DiscoveryFilters } from "@/components/discovery/filters"
import { BoardingHouseCard } from "@/components/discovery/boarding-house-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getBoardingHouses,
  getDiscoveryAmenities,
  type BoardingHouseFilters,
} from "@/lib/data/boarding-houses"

export const metadata = { title: "Discover boarding houses" }
export const dynamic = "force-dynamic"

type Params = Record<string, string | string[] | undefined>
const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value
const multiple = (value: string | string[] | undefined) =>
  value ? (Array.isArray(value) ? value : [value]) : []

function hiddenFilters(filters: BoardingHouseFilters, omit: string[]) {
  return Object.entries(filters).flatMap(([name, raw]) => {
    if (omit.includes(name) || raw === undefined) return []
    const values = Array.isArray(raw) ? raw : [raw]
    return values
      .filter(Boolean)
      .map((value) => (
        <input
          key={`${name}-${value}`}
          type="hidden"
          name={name}
          value={value}
        />
      ))
  })
}

export default async function BoardingHousesPage({
  searchParams,
}: {
  searchParams: Promise<Params>
}) {
  const params = await searchParams
  const filters: BoardingHouseFilters = {
    search: single(params.search),
    province: single(params.province),
    city: single(params.city),
    barangay: single(params.barangay),
    minPrice: single(params.minPrice),
    maxPrice: single(params.maxPrice),
    roomType: single(params.roomType),
    amenities: multiple(params.amenities),
    capacity: single(params.capacity),
    available: single(params.available),
    sort: single(params.sort),
    page: single(params.page),
  }
  const [result, amenities] = await Promise.all([
    getBoardingHouses(filters),
    getDiscoveryAmenities(),
  ])
  const query = new URLSearchParams()
  for (const [name, raw] of Object.entries(filters)) {
    if (name === "page" || raw === undefined) continue
    for (const value of Array.isArray(raw) ? raw : [raw])
      if (value) query.append(name, value)
  }
  const paginationBase = `/boarding-houses${query.size ? `?${query}` : ""}`
  return (
    <>
      <PublicNavbar />
      <main id="main-content" className="page-container py-10 sm:py-14">
        <DashboardHeader
          title="Find a place that fits."
          description="Search reviewed boarding houses by location, room, monthly rent, and amenities."
        />
        <form
          action="/boarding-houses"
          className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-sm"
        >
          {hiddenFilters(filters, ["search", "page"])}
          <Search className="ml-2 size-4 shrink-0 text-muted-foreground" />
          <label htmlFor="boarding-house-search" className="sr-only">
            Search boarding houses
          </label>
          <Input
            id="boarding-house-search"
            name="search"
            defaultValue={filters.search}
            placeholder="Search by property, listing, barangay, city, or province…"
            maxLength={100}
            className="h-10 border-0 shadow-none focus-visible:ring-0"
          />
          <Button type="submit" className="h-10 px-4">
            Search
          </Button>
        </form>
        <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <DiscoveryFilters amenities={amenities} values={filters} />
          <section aria-labelledby="results-title">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="results-title" className="font-semibold">
                  Available properties
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {result.total}{" "}
                  {result.total === 1 ? "boarding house" : "boarding houses"}{" "}
                  found
                </p>
              </div>
              <form
                action="/boarding-houses"
                className="flex items-center gap-2"
              >
                {hiddenFilters(filters, ["sort", "page"])}
                <label htmlFor="sort" className="text-xs text-muted-foreground">
                  Sort by
                </label>
                <select
                  id="sort"
                  name="sort"
                  defaultValue={filters.sort || "newest"}
                  className="form-select h-9 w-38"
                >
                  <option value="newest">Newest</option>
                  <option value="price_low">Lowest price</option>
                  <option value="price_high">Highest price</option>
                  <option value="name">Name</option>
                </select>
                <Button type="submit" variant="outline">
                  Apply
                </Button>
              </form>
            </div>
            {result.items.length ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
                  {result.items.map((item) => (
                    <BoardingHouseCard key={item.house_id} item={item} />
                  ))}
                </div>
                <Pagination
                  page={result.page}
                  total={result.total}
                  pageSize={result.pageSize}
                  base={paginationBase}
                />
              </>
            ) : (
              <EmptyState
                title={
                  !result.configured
                    ? "Your next space is on its way."
                    : result.unavailable
                      ? "Discovery is temporarily unavailable."
                      : "No boarding houses match your filters."
                }
                description={
                  !result.configured
                    ? "BoardingHub is waiting for its Supabase connection before properties can appear."
                    : result.unavailable
                      ? "Please try again shortly. If this is a new deployment, apply the Phase 2 Supabase migration first."
                      : "Try clearing one or more filters or searching a broader location."
                }
              />
            )}
          </section>
        </div>
      </main>
    </>
  )
}
