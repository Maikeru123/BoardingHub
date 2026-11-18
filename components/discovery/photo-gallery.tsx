"use client"

import { useState } from "react"
import Image from "next/image"
import { Building2, Images } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Photo, RoomPhoto } from "@/types/domain"

export function PhotoGallery({
  photos,
  name,
}: {
  photos: (Photo | RoomPhoto)[]
  name: string
}) {
  const [selected, setSelected] = useState<number | null>(null)
  if (!photos.length)
    return (
      <div className="flex aspect-[16/6] items-center justify-center rounded-2xl border bg-muted text-muted-foreground">
        <div className="text-center">
          <Building2 className="mx-auto mb-3 size-12 opacity-40" />
          <p className="text-sm">No photos available</p>
        </div>
      </div>
    )
  return (
    <>
      <div className="relative grid gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
        {photos.slice(0, 5).map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Open ${name} photo ${index + 1}`}
            className={`relative overflow-hidden bg-muted ${index === 0 ? "aspect-[16/9] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-105" : "hidden min-h-50 sm:block"}`}
          >
            {photo.url && (
              <Image
                src={photo.url}
                alt={`${name} photo ${index + 1}`}
                fill
                unoptimized
                sizes={index === 0 ? "70vw" : "25vw"}
                className="object-cover transition-transform hover:scale-105"
              />
            )}
          </button>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="absolute right-4 bottom-4 shadow-md"
          onClick={() => setSelected(0)}
        >
          <Images /> View all {photos.length} photos
        </Button>
      </div>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <SheetContent className="w-full! overflow-y-auto sm:max-w-5xl!">
          <SheetHeader>
            <SheetTitle>{name} photos</SheetTitle>
            <SheetDescription>
              Photos provided by the property owner.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 pb-8 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelected(index)}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-muted ring-offset-2 ${selected === index ? "ring-2 ring-primary" : ""}`}
                aria-label={`Select photo ${index + 1}`}
              >
                {photo.url && (
                  <Image
                    src={photo.url}
                    alt={`${name} photo ${index + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 90vw, 45vw"
                    className="object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
