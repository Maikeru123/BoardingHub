import Image from "next/image"
import Link from "next/link"
import { BedDouble, Building2, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { currency, label } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BoardingHouseDiscoveryItem } from "@/types/domain"

export function BoardingHouseCard({
  item,
}: {
  item: BoardingHouseDiscoveryItem
}) {
  const location = [item.barangay, item.city_municipality, item.province]
    .filter(Boolean)
    .join(", ")
  return (
    <Card className="group gap-0 py-0 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
      <div className="relative aspect-[1.55] overflow-hidden bg-muted">
        {item.primary_photo_url ? (
          <Image
            src={item.primary_photo_url}
            alt={`${item.house_name} primary photo`}
            fill
            unoptimized
            sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 28vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Building2 className="size-11 opacity-40" />
            <span className="text-xs">Photo coming soon</span>
          </div>
        )}
        <Badge className="absolute top-3 left-3 border-0 bg-card/95 text-foreground shadow-sm">
          Reviewed listing
        </Badge>
      </div>
      <CardContent className="flex-1 p-5">
        <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />{" "}
          {location || "Location not provided"}
        </p>
        <h2 className="mt-2 line-clamp-1 text-lg font-semibold tracking-tight">
          {item.house_name}
        </h2>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {item.listing_title}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.room_types.slice(0, 2).map((type) => (
            <Badge key={type} variant="secondary">
              {label(type)}
            </Badge>
          ))}
          {item.amenities.slice(0, 2).map((amenity) => (
            <Badge key={amenity.id} variant="outline">
              {amenity.name}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-4 p-5">
        <div>
          <p className="font-semibold text-primary">
            {item.starting_rent === null
              ? "Contact owner"
              : currency(item.starting_rent)}
            {item.starting_rent !== null && (
              <span className="text-[11px] font-normal text-muted-foreground">
                {" "}
                / month
              </span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <BedDouble className="size-3.5" /> {item.available_room_count}{" "}
            available {item.available_room_count === 1 ? "room" : "rooms"}
          </p>
        </div>
        <Link
          href={`/boarding-houses/${item.house_id}`}
          className={cn(buttonVariants({ variant: "default" }), "h-9 px-3")}
        >
          View details
        </Link>
      </CardFooter>
    </Card>
  )
}
