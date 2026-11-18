import Image from "next/image"
import Link from "next/link"
import { BedDouble, Building2, MapPin, Search, ShieldCheck } from "lucide-react"
import { getPublicListings } from "@/lib/data"
import { currency } from "@/lib/format"
import { EmptyState, Pagination } from "@/components/shared"
export async function ExploreListings({
  search = "",
  page = 1,
  base = "/listings",
  compact = false,
}: {
  search?: string
  page?: number
  base?: string
  compact?: boolean
}) {
  const { listings, total, configured } = await getPublicListings(search, page)
  return (
    <>
      {!compact && (
        <form
          action={base}
          className="mb-7 flex max-w-2xl items-center gap-3 rounded-xl border bg-card p-2"
        >
          <Search className="ml-3 size-4 text-muted-foreground" />
          <label htmlFor="listing-search" className="sr-only">
            Search listings by title
          </label>
          <input
            id="listing-search"
            name="q"
            defaultValue={search}
            placeholder="Search listings by title…"
            maxLength={100}
            className="h-9 w-full min-w-0 bg-transparent text-sm outline-none"
          />
          <button
            type="submit"
            className="h-9 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
          >
            Search
          </button>
        </form>
      )}
      {listings.length ? (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {total} {total === 1 ? "listing" : "listings"} to explore
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(compact ? listings.slice(0, 3) : listings).map(
              ({ listing, house, rooms, photo }) => (
                <Link
                  key={listing.id}
                  href={`${base}/${listing.id}`}
                  className="group overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="relative aspect-[1.6] bg-muted">
                    {photo?.url ? (
                      <Image
                        src={photo.url}
                        alt={listing.title}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 90vw, 30vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Building2 className="size-12 text-muted-foreground/40" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 flex items-center gap-1 rounded-md bg-card/95 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                      <ShieldCheck className="size-3" />
                      Reviewed listing
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" />
                      {[house.city_municipality, house.province]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <h2 className="line-clamp-2 font-semibold tracking-tight group-hover:text-primary">
                      {listing.title}
                    </h2>
                    <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                      {house.name}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t pt-4">
                      <p className="text-base font-semibold text-primary">
                        {rooms.length ? (
                          <>
                            {currency(rooms[0].monthly_rent)}
                            <span className="text-xs font-normal text-muted-foreground">
                              {" "}
                              / month
                            </span>
                          </>
                        ) : (
                          "Contact property"
                        )}
                      </p>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BedDouble className="size-4" />
                        {rooms.length} rooms
                      </span>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
          {!compact && (
            <Pagination
              page={page}
              total={total}
              pageSize={12}
              base={`${base}?q=${encodeURIComponent(search)}`}
            />
          )}
        </>
      ) : (
        <EmptyState
          title={
            !configured
              ? "Your next space is on its way."
              : search
                ? "No listings match your search."
                : "No published boarding houses yet."
          }
          description={
            !configured
              ? "We’re preparing BoardingHub for its first properties. Check back soon to explore available places."
              : search
                ? "Try a different boarding house name or a shorter search."
                : "New places will appear here after their listings have been reviewed."
          }
        />
      )}
    </>
  )
}
