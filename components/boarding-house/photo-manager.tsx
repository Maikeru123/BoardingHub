"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import {
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Star,
  Trash2,
  X,
} from "lucide-react"
import {
  removeHousePhoto,
  replaceHousePhoto,
  setPrimaryHousePhoto,
  uploadHousePhoto,
} from "@/actions/photos"
import { ActionButton } from "@/components/action-button"
import { Button } from "@/components/ui/button"
import { useActionResult } from "@/hooks/use-action-result"
import type { Photo } from "@/types/domain"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function BoardingHousePhotoManager({
  houseId,
  photos,
  editable,
}: {
  houseId: string
  photos: Photo[]
  editable: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const replacementInput = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<
    { file: File; previewUrl: string }[]
  >([])
  const previewUrls = useRef(new Set<string>())
  const [replaceTarget, setReplaceTarget] = useState<string>()
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [localError, setLocalError] = useState<string>()
  const { run, error } = useActionResult()

  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function releasePreview(url: string) {
    URL.revokeObjectURL(url)
    previewUrls.current.delete(url)
  }

  function validate(files: File[], replacing = false) {
    if (files.some((file) => !allowedTypes.has(file.type)))
      return "Only JPEG, PNG, and WebP images are supported."
    if (files.some((file) => !file.size || file.size > 5 * 1024 * 1024))
      return "Each image must be smaller than 5 MB."
    if (!replacing && photos.length + files.length > 12)
      return `You can add ${12 - photos.length} more photo${12 - photos.length === 1 ? "" : "s"}.`
  }

  async function uploadSelected() {
    setPending(true)
    setProgress(0)
    let completed = 0
    for (const item of selected) {
      const data = new FormData()
      data.set("photo", item.file)
      if (!(await run(() => uploadHousePhoto(houseId, data)))) break
      completed += 1
      setProgress(completed)
    }
    setSelected((items) => {
      items
        .slice(0, completed)
        .forEach((item) => releasePreview(item.previewUrl))
      return items.slice(completed)
    })
    setPending(false)
    if (input.current) input.current.value = ""
  }

  return (
    <div className="space-y-5">
      {photos.length || selected.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-[4/3] bg-muted">
                {photo.url ? (
                  <Image
                    src={photo.url}
                    alt={
                      photo.is_primary
                        ? "Primary boarding house photo"
                        : "Boarding house photo"
                    }
                    fill
                    unoptimized
                    sizes="(min-width: 1024px) 33vw, 50vw"
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
                <div className="flex flex-wrap justify-between gap-2 p-2">
                  <ActionButton
                    action={() => setPrimaryHousePhoto(photo.id)}
                    disabled={photo.is_primary}
                  >
                    <Star className="size-3" />
                    Set primary
                  </ActionButton>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReplaceTarget(photo.id)
                      replacementInput.current?.click()
                    }}
                  >
                    <RefreshCw className="size-3" />
                    Replace
                  </Button>
                  <ActionButton
                    action={() => removeHousePhoto(photo.id)}
                    variant="destructive"
                    confirmation="Remove this image from the boarding house? If it is primary, the oldest remaining photo will become primary."
                  >
                    <Trash2 className="size-3" />
                    <span className="sr-only">Remove photo</span>
                  </ActionButton>
                </div>
              )}
            </div>
          ))}
          {selected.map((item, index) => (
            <div
              key={item.previewUrl}
              className="overflow-hidden rounded-lg border border-dashed border-primary/40"
            >
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={item.previewUrl}
                  alt={`Selected property photo ${index + 1}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 33vw, 50vw"
                  className="object-cover opacity-80"
                />
                <span className="absolute top-2 left-2 rounded-md bg-card px-2 py-1 text-[10px] font-semibold">
                  Ready to upload
                </span>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label={`Remove selected photo ${index + 1}`}
                  className="absolute top-2 right-2"
                  disabled={pending}
                  onClick={() => {
                    releasePreview(item.previewUrl)
                    setSelected((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }}
                >
                  <X />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          <ImagePlus className="mx-auto mb-3 size-8 text-primary/50" />
          No property photos uploaded yet.
        </div>
      )}
      {editable && (
        <div className="space-y-3">
          <input
            ref={input}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose boarding house photos"
            className="sr-only"
            disabled={pending || photos.length + selected.length >= 12}
            onChange={(event) => {
              const files = Array.from(event.target.files || [])
              const validationError = validate(files)
              setLocalError(validationError)
              if (validationError) event.currentTarget.value = ""
              if (!validationError) {
                selected.forEach((item) => releasePreview(item.previewUrl))
                setSelected(
                  files.map((file) => {
                    const previewUrl = URL.createObjectURL(file)
                    previewUrls.current.add(previewUrl)
                    return { file, previewUrl }
                  })
                )
              }
            }}
          />
          <input
            ref={replacementInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a replacement property photo"
            className="sr-only"
            disabled={pending}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file || !replaceTarget) return
              const validationError = validate([file], true)
              setLocalError(validationError)
              if (validationError) {
                event.currentTarget.value = ""
                return
              }
              setPending(true)
              const data = new FormData()
              data.set("photo", file)
              await run(() => replaceHousePhoto(houseId, replaceTarget, data))
              setPending(false)
              setReplaceTarget(undefined)
              if (replacementInput.current) replacementInput.current.value = ""
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={pending || photos.length + selected.length >= 12}
              onClick={() => input.current?.click()}
            >
              <ImagePlus />
              Choose photos
            </Button>
            {selected.length > 0 && (
              <Button type="button" disabled={pending} onClick={uploadSelected}>
                {pending ? <LoaderCircle className="animate-spin" /> : null}
                {pending
                  ? `Uploading ${Math.min(progress + 1, selected.length)} of ${selected.length}…`
                  : `Upload ${selected.length} photo${selected.length === 1 ? "" : "s"}`}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              JPEG, PNG or WebP · Up to 5 MB each · {photos.length}/12 uploaded
            </p>
          </div>
          {pending && selected.length > 0 && (
            <progress
              className="h-2 w-full max-w-md accent-primary"
              value={progress}
              max={selected.length}
              aria-label="Photo upload progress"
            />
          )}
        </div>
      )}
      {(localError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {localError || error}
        </p>
      )}
    </div>
  )
}
