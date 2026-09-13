"use client"
import Image from "next/image"
import { useRef, useState } from "react"
import { ImagePlus, Star, Trash2, LoaderCircle } from "lucide-react"
import { uploadPhoto, setPrimaryPhoto, removePhoto } from "@/actions/photos"
import { ActionButton } from "@/components/action-button"
import { Button } from "@/components/ui/button"
import { useActionResult } from "@/hooks/use-action-result"
import type { Photo } from "@/types/domain"
export function PhotoManager({
  listingId,
  photos,
  editable,
}: {
  listingId: string
  photos: Photo[]
  editable: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const { run, error } = useActionResult()
  return (
    <div className="space-y-5">
      {photos.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-[4/3] bg-muted">
                {photo.url ? (
                  <Image
                    src={photo.url}
                    alt={
                      photo.is_primary
                        ? "Primary listing photo"
                        : "Listing photo"
                    }
                    fill
                    unoptimized
                    sizes="33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    Photo unavailable
                  </span>
                )}
                {photo.is_primary && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-card px-2 py-1 text-[10px] font-semibold">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    Primary image
                  </span>
                )}
              </div>
              {editable && (
                <div className="flex justify-between gap-2 p-2">
                  <ActionButton action={() => setPrimaryPhoto(photo.id)}>
                    <Star className="size-3" />
                    Set primary
                  </ActionButton>
                  <ActionButton
                    action={() => removePhoto(photo.id)}
                    variant="destructive"
                    confirmation="Remove this image from your listing? If it is the primary image, another photo will be selected."
                  >
                    <Trash2 className="size-3" />
                    <span className="sr-only">Remove photo</span>
                  </ActionButton>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <ImagePlus className="mx-auto mb-3 size-8 text-primary/50" />
          No photos uploaded yet.
        </div>
      )}
      {editable && (
        <div className="flex flex-wrap items-center gap-4">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload listing photo"
            className="sr-only"
            disabled={pending || photos.length >= 12}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setPending(true)
              const data = new FormData()
              data.set("photo", file)
              await run(() => uploadPhoto(listingId, data))
              setPending(false)
              if (input.current) input.current.value = ""
            }}
          />
          <Button
            variant="outline"
            className="h-10"
            disabled={pending || photos.length >= 12}
            onClick={() => input.current?.click()}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <ImagePlus />
            )}
            {pending ? "Uploading…" : "Upload photo"}
          </Button>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG or WebP · Up to 5 MB each · {photos.length}/12 photos
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
