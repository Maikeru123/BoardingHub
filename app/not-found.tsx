import { Brand, LinkButton } from "@/components/shared"
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <Brand />
      <p className="mt-5 text-sm font-semibold text-primary">
        404 · PAGE NOT FOUND
      </p>
      <h1 className="text-3xl font-semibold">This place isn’t on the map.</h1>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        The page may have moved, or the listing is no longer available to you.
      </p>
      <LinkButton href="/">Back to home</LinkButton>
    </main>
  )
}
