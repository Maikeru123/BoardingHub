import Link from "next/link"
import { Brand, LinkButton } from "@/components/shared"
export function PublicNavbar() {
  return (
    <header className="border-b bg-card">
      <div className="page-container flex h-20 items-center justify-between gap-4">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-5 text-sm sm:gap-8"
        >
          <Link
            href="/listings"
            className="hidden text-muted-foreground hover:text-primary sm:block"
          >
            Find a place
          </Link>
          <Link
            href="/register?role=owner"
            className="hidden text-muted-foreground hover:text-primary md:block"
          >
            List your property
          </Link>
          <Link href="/login" className="font-medium hover:text-primary">
            Sign in
          </Link>
          <LinkButton href="/register" className="hidden sm:inline-flex">
            Get started
          </LinkButton>
        </nav>
      </div>
    </header>
  )
}
