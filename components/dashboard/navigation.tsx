"use client"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BedDouble,
  Building2,
  ClipboardCheck,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  ChevronDown,
  ArrowUpRight,
  CalendarRange,
  CreditCard,
  Flag,
  KeyRound,
  MessageSquareText,
} from "lucide-react"
import { signOut } from "@/actions/auth"
import { Brand } from "@/components/shared"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { label } from "@/lib/format"
import { cn } from "@/lib/utils"
import { UnreadInquiryBadge } from "@/components/inquiries/unread-badge"
import type { Profile, Role } from "@/types/domain"

const navigation = {
  owner: [
    { href: "/owner", label: "Overview", icon: LayoutDashboard },
    {
      href: "/owner/boarding-houses",
      label: "Boarding houses",
      icon: Building2,
    },
    { href: "/owner/rooms", label: "Rooms", icon: BedDouble },
    { href: "/owner/listings", label: "Listings", icon: FileText },
    {
      href: "/owner/inquiries",
      label: "Tenant inquiries",
      icon: MessageSquare,
    },
    {
      href: "/owner/rental-requests",
      label: "Rental requests",
      icon: CalendarRange,
    },
    { href: "/owner/rentals", label: "Rentals", icon: KeyRound },
    { href: "/owner/payments", label: "Payments", icon: CreditCard },
    { href: "/owner/feedback", label: "Feedback", icon: MessageSquareText },
    {
      href: "/owner/verifications",
      label: "Verification status",
      icon: ClipboardCheck,
    },
  ],
  tenant: [
    { href: "/tenant", label: "Overview", icon: LayoutDashboard },
    {
      href: "/boarding-houses",
      label: "Explore boarding houses",
      icon: Compass,
    },
    { href: "/tenant/inquiries", label: "My inquiries", icon: MessageSquare },
    { href: "/tenant/rentals", label: "My rentals", icon: KeyRound },
    { href: "/tenant/payments", label: "Payments", icon: CreditCard },
    { href: "/tenant/feedback", label: "Feedback", icon: MessageSquareText },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    {
      href: "/admin/verifications",
      label: "Boarding house verification",
      icon: ShieldCheck,
    },
    { href: "/admin/listings", label: "All listings", icon: FileText },
    { href: "/admin/rentals", label: "Rentals", icon: KeyRound },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
    { href: "/admin/reports", label: "Reports", icon: Flag },
    { href: "/admin/feedback", label: "Feedback", icon: MessageSquareText },
    {
      href: "/admin/boarding-houses",
      label: "Boarding houses",
      icon: Building2,
    },
    { href: "/admin/users", label: "User accounts", icon: Users },
  ],
}
function SidebarContents({
  role,
  unreadInquiryCount,
  close,
}: {
  role: Role
  unreadInquiryCount: number
  close?: () => void
}) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-8 pb-9">
        <Brand />
        <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary/7 px-2.5 py-1.5 text-[11px] font-semibold tracking-widest text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          {role === "owner"
            ? "Owner workspace"
            : role === "admin"
              ? "Administration"
              : "Tenant workspace"}
        </div>
      </div>
      <p className="mb-3 px-6 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        Workspace
      </p>
      <nav aria-label="Dashboard navigation" className="space-y-1 px-3">
        {navigation[role].map((item) => {
          const active =
            item.href === `/${role}`
              ? pathname === item.href
              : pathname.startsWith(item.href)
          const inquiryItem = item.href.endsWith("/inquiries")
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary/9 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
              {inquiryItem && unreadInquiryCount > 0 ? (
                <span className="ml-auto">
                  <UnreadInquiryBadge count={unreadInquiryCount} />
                </span>
              ) : active ? (
                <span className="ml-auto size-1.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-3 pt-10 pb-5">
        <div className="mb-5 rounded-xl border bg-background p-4">
          <ShieldCheck className="mb-3 size-6 text-primary" />
          <p className="text-sm font-semibold">A little more peace of mind.</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Boarding houses are reviewed before owners can add rooms.
          </p>
        </div>
        <Link
          href={`/${role}/profile`}
          onClick={close}
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] text-muted-foreground hover:bg-muted"
        >
          <Settings className="size-[18px]" />
          Account settings
        </Link>
        <Link
          href="/boarding-houses"
          onClick={close}
          className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] text-muted-foreground hover:bg-muted"
        >
          <Compass className="size-[18px]" />
          Explore BoardingHub
          <ArrowUpRight className="ml-auto size-4" />
        </Link>
      </div>
    </div>
  )
}
export function Sidebar({
  role,
  unreadInquiryCount,
}: {
  role: Role
  unreadInquiryCount: number
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r bg-card lg:block">
      <SidebarContents role={role} unreadInquiryCount={unreadInquiryCount} />
    </aside>
  )
}
export function MobileNavigation({
  role,
  unreadInquiryCount,
}: {
  role: Role
  unreadInquiryCount: number
}) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
          />
        }
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-72! overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>BoardingHub navigation</SheetTitle>
          <SheetDescription>Navigate your workspace.</SheetDescription>
        </SheetHeader>
        <SidebarContents
          role={role}
          unreadInquiryCount={unreadInquiryCount}
          close={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
export function UserMenu({
  profile,
  unreadInquiryCount = 0,
}: {
  profile: Profile
  unreadInquiryCount?: number
}) {
  const { setTheme, resolvedTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-3 rounded-lg p-1 text-left"
        aria-label="Open account menu"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {profile.first_name[0]}
          {profile.last_name[0]}
        </span>
        <span className="hidden sm:block">
          <span className="block text-xs font-semibold">
            {profile.first_name} {profile.last_name}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {profile.role === "owner" ? "Property owner" : label(profile.role)}
          </span>
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem render={<Link href={`/${profile.role}`} />}>
          <LayoutDashboard />
          Dashboard
        </DropdownMenuItem>
        {profile.role === "owner" && (
          <DropdownMenuItem render={<Link href="/owner/boarding-houses" />}>
            <Building2 />
            My properties
          </DropdownMenuItem>
        )}
        {(profile.role === "tenant" || profile.role === "owner") && (
          <DropdownMenuItem
            render={<Link href={`/${profile.role}/inquiries`} />}
          >
            <MessageSquare />
            {profile.role === "tenant" ? "My inquiries" : "Inquiries"}
            {unreadInquiryCount > 0 && (
              <span className="ml-auto">
                <UnreadInquiryBadge count={unreadInquiryCount} />
              </span>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/${profile.role}/profile`} />}>
          <Settings />
          Account settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden dark:block" />
          <Moon className="dark:hidden" />
          Toggle appearance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export function DashboardBreadcrumbs({ role }: { role: Role }) {
  const pathname = usePathname()
  const segment = pathname.split("/")[2]
  const title = segment ? label(segment.replaceAll("-", " ")) : "Overview"
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={`/${role}`} />}>
            {label(role)}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
