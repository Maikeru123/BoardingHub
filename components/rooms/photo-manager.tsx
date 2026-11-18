"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ImagePlus, RefreshCw, Star, Trash2 } from "lucide-react"
import {
  removeRoomPhoto,
  replaceRoomPhoto,
  setPrimaryRoomPhoto,
  uploadRoomPhoto,
} from "@/actions/photos"
import { ActionButton } from "@/components/action-button"
import { Button } from "@/components/ui/button"
import { useActionResult } from "@/hooks/use-action-result"
import type { RoomPhoto } from "@/types/domain"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

export function RoomPhotoManager({
  roomId,
  photos,
}: {
  roomId: string
  photos: RoomPhoto[]
}) {
  const uploadInput = useRef<HTMLInputElement>(null)
  const replacementInput = useRef<HTMLInputElement>(null)
  const [replaceTarget, setReplaceTarget] = useState<string>()
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [localError, setLocalError] = useState<string>()
  const { run, error } = useActionResult()

  function validate(files: File[], replacing = false) {
    if (files.some((file) => !allowedTypes.has(file.type)))
      return "Only JPEG, PNG, and WebP images are supported."
    if (files.some((file) => !file.size || file.size > 5 * 1024 * 1024))
      return "Each image must be smaller than 5 MB."
    if (!replacing && photos.length + files.length > 12)
      return `You can add ${12 - photos.length} more room photo${12 - photos.length === 1 ? "" : "s"}.`
  }

  async function upload(files: File[]) {
    const validationError = validate(files)
    setLocalError(validationError)
    if (validationError) return
    setPending(true)
    setProgress(0)
    for (let index = 0; index < files.length; index += 1) {
      const data = new FormData()
      data.set("photo", files[index])
      if (!(await run(() => uploadRoomPhoto(roomId, data)))) break
      setProgress(index + 1)
    }
    setPending(false)
    if (uploadInput.current) uploadInput.current.value = ""
  }

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
                    alt={photo.is_primary ? "Primary room photo" : "Room photo"}
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
              <div className="flex flex-wrap justify-between gap-2 p-2">
                <ActionButton
                  action={() => setPrimaryRoomPhoto(photo.id)}
                  disabled={photo.is_primary}
                >
                  <Star className="size-3" /> Set primary
                </ActionButton>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReplaceTarget(photo.id)
                    replacementInput.current?.click()
                  }}
                >
                  <RefreshCw className="size-3" /> Replace
                </Button>
                <ActionButton
                  action={() => removeRoomPhoto(photo.id)}
                  variant="destructive"
                  confirmation="Remove this room photo?"
                >
                  <Trash2 className="size-3" />
                  <span className="sr-only">Remove photo</span>
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No room photos yet.
        </p>
      )}

      <input
        ref={uploadInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => upload(Array.from(event.target.files || []))}
      />
      <input
        ref={replacementInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ""
          if (!file || !replaceTarget) return
          const validationError = validate([file], true)
          setLocalError(validationError)
          if (validationError) return
          setPending(true)
          const data = new FormData()
          data.set("photo", file)
          await run(() => replaceRoomPhoto(roomId, replaceTarget, data))
          setPending(false)
          setReplaceTarget(undefined)
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={pending || photos.length >= 12}
          onClick={() => uploadInput.current?.click()}
        >
          <ImagePlus /> Add room photos
        </Button>
        <span className="text-xs text-muted-foreground">
          {photos.length}/12 photos
          {pending && ` · Uploaded ${progress}`}
        </span>
      </div>
      {(localError || error) && (
        <p role="alert" className="text-sm text-destructive">
          {localError || error}
        </p>
      )}
    </div>
  )
}
