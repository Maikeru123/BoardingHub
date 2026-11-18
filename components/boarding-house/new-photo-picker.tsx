"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"])

type Selection = { file: File; previewUrl: string }

export function NewBoardingHousePhotoPicker({
  disabled,
  progress,
  onFilesChange,
  subject = "boarding house",
}: {
  disabled: boolean
  progress: number
  onFilesChange: (files: File[]) => void
  subject?: "boarding house" | "room"
}) {
  const input = useRef<HTMLInputElement>(null)
  const previewUrls = useRef(new Set<string>())
  const [selected, setSelected] = useState<Selection[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  function releasePreview(url: string) {
    URL.revokeObjectURL(url)
    previewUrls.current.delete(url)
  }

  function updateSelection(items: Selection[]) {
    setSelected(items)
    onFilesChange(items.map(({ file }) => file))
  }

  return (
    <div className="space-y-4 sm:col-span-2">
      <input
        ref={input}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        aria-label={`Choose ${subject} photos`}
        className="sr-only"
        disabled={disabled || selected.length >= 12}
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          let validationError: string | undefined
          if (files.some((file) => !allowedTypes.has(file.type)))
            validationError = "Only JPEG, PNG, and WebP images are supported."
          else if (
            files.some((file) => !file.size || file.size > 5 * 1024 * 1024)
          )
            validationError = "Each image must be smaller than 5 MB."
          else if (files.length > 12)
            validationError = `A ${subject} can have up to 12 photos.`

          setError(validationError)
          event.currentTarget.value = ""
          if (validationError) return

          selected.forEach(({ previewUrl }) => releasePreview(previewUrl))
          updateSelection(
            files.map((file) => {
              const previewUrl = URL.createObjectURL(file)
              previewUrls.current.add(previewUrl)
              return { file, previewUrl }
            })
          )
        }}
      />

      {selected.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-2 left-2 rounded-md bg-card px-2 py-1 text-[10px] font-semibold">
                    Primary image
                  </span>
                )}
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label={`Remove selected photo ${index + 1}`}
                  className="absolute top-2 right-2"
                  disabled={disabled}
                  onClick={() => {
                    releasePreview(item.previewUrl)
                    updateSelection(
                      selected.filter(
                        (_, selectedIndex) => selectedIndex !== index
                      )
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
        <button
          type="button"
          disabled={disabled}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ImagePlus className="mb-3 size-8 text-primary/50" />
          Choose {subject} photos
          <span className="mt-1 text-xs">
            JPEG, PNG or WebP · Up to 5 MB each
          </span>
        </button>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <ImagePlus />
            Change selection
          </Button>
          <p className="text-xs text-muted-foreground">
            {selected.length}/12 selected · The first photo will be primary
          </p>
        </div>
      )}

      {disabled && selected.length > 0 && (
        <div className="space-y-1">
          <progress
            className="h-2 w-full accent-primary"
            value={progress}
            max={selected.length}
            aria-label={`${subject} photo upload progress`}
          />
          <p className="text-xs text-muted-foreground">
            Uploading {Math.min(progress + 1, selected.length)} of{" "}
            {selected.length} photos…
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
