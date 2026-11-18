import {
  Sidebar,
  MobileNavigation,
  UserMenu,
  DashboardBreadcrumbs,
} from "./navigation"
import { getNavigationUnreadCount } from "@/lib/data/inquiries"
import type { Profile, Role } from "@/types/domain"
export async function DashboardShell({
  profile,
  children,
}: {
  profile: Profile
  children: React.ReactNode
}) {
  const role = profile.role as Role
  const unreadInquiryCount =
    role === "tenant" || role === "owner"
      ? await getNavigationUnreadCount(role)
      : 0
  return (
    <div className="min-h-screen">
      <Sidebar role={role} unreadInquiryCount={unreadInquiryCount} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b bg-card/95 px-5 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <MobileNavigation
              role={role}
              unreadInquiryCount={unreadInquiryCount}
            />
            <DashboardBreadcrumbs role={role} />
          </div>
          <UserMenu profile={profile} unreadInquiryCount={unreadInquiryCount} />
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1500px] p-5 sm:p-8 lg:p-10"
        >
          {children}
        </main>
        <footer className="mx-5 flex flex-wrap justify-between gap-2 border-t py-5 text-[11px] text-muted-foreground sm:mx-8 lg:mx-10">
          <span>© {new Date().getFullYear()} BoardingHub</span>
          <span>Find a place. Manage with ease.</span>
        </footer>
      </div>
    </div>
  )
}
