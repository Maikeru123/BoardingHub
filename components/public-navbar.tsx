import Link from "next/link"
import { getPublicSessionProfile } from "@/lib/auth"
import { getSessionUnreadInquiryCount } from "@/lib/data/inquiries"
import { Brand, LinkButton } from "@/components/shared"
import { UserMenu } from "@/components/dashboard/navigation"
import { UnreadInquiryBadge } from "@/components/inquiries/unread-badge"
import type { Role } from "@/types/domain"

const navLink =
  "inline-flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-primary"

export async function PublicNavbar() {
  const session = await getPublicSessionProfile()
  const profile = session?.profile
  const role = profile?.role as Role | undefined
  const unreadInquiryCount =
    session &&
    profile?.status === "active" &&
    (role === "tenant" || role === "owner")
      ? await getSessionUnreadInquiryCount(session.supabase, session.user.id)
      : 0

  return (
    <header className="border-b bg-card">
      <div className="page-container flex h-20 items-center justify-between gap-4">
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex min-w-0 items-center gap-3 sm:gap-5"
        >
          {!profile ? (
            <>
              <Link
                href="/boarding-houses"
                className={`${navLink} hidden sm:inline-flex`}
              >
                Find a place
              </Link>
              <Link
                href="/register?role=owner"
                className={`${navLink} hidden md:inline-flex`}
              >
                List your property
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium whitespace-nowrap hover:text-primary"
              >
                Sign in
              </Link>
              <LinkButton href="/register" className="hidden sm:inline-flex">
                Get started
              </LinkButton>
            </>
          ) : (
            <>
              <Link
                href="/boarding-houses"
                className={`${navLink} hidden sm:inline-flex`}
              >
                Explore boarding houses
              </Link>
              {role === "tenant" && (
                <>
                  <Link
                    href="/tenant/inquiries"
                    className={`${navLink} hidden md:inline-flex`}
                  >
                    My inquiries
                    <UnreadInquiryBadge count={unreadInquiryCount} />
                  </Link>
                  <Link href="/tenant" className={navLink}>
                    Dashboard
                  </Link>
                </>
              )}
              {role === "owner" && (
                <>
                  <Link
                    href="/owner"
                    className={`${navLink} hidden sm:inline-flex`}
                  >
                    Owner dashboard
                  </Link>
                  <Link
                    href="/owner/boarding-houses"
                    className={`${navLink} hidden lg:inline-flex`}
                  >
                    My properties
                  </Link>
                  <Link
                    href="/owner/inquiries"
                    className={`${navLink} hidden md:inline-flex`}
                  >
                    Inquiries
                    <UnreadInquiryBadge count={unreadInquiryCount} />
                  </Link>
                </>
              )}
              {role === "admin" && (
                <Link href="/admin" className={navLink}>
                  Admin dashboard
                </Link>
              )}
              <UserMenu
                profile={profile}
                unreadInquiryCount={unreadInquiryCount}
              />
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
