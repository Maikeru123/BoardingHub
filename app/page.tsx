import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  Check,
  MapPin,
  Search,
  ShieldCheck,
  KeyRound,
  BedDouble,
} from "lucide-react"
import { PublicNavbar } from "@/components/public-navbar"
import { Brand, LinkButton } from "@/components/shared"

export default function HomePage() {
  return (
    <>
      <PublicNavbar />
      <main id="main-content">
        <section className="page-container grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />A better
              place to begin
            </p>
            <h1 className="max-w-xl text-5xl leading-[1.12] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[68px]">
              Find a place.
              <br />
              Feel <span className="text-primary">at home.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
              Your next chapter starts with the right space. Discover boarding
              houses, explore the details, and find a place that feels like you.
            </p>
            <form
              action="/listings"
              className="mt-9 flex max-w-lg items-center gap-3 rounded-xl border bg-card p-2 shadow-lg shadow-slate-200/30 dark:shadow-none"
            >
              <MapPin className="ml-3 size-5 shrink-0 text-primary" />
              <label htmlFor="home-search" className="sr-only">
                Search boarding house listings
              </label>
              <input
                id="home-search"
                name="q"
                placeholder="Search a boarding house…"
                className="h-12 w-full min-w-0 bg-transparent text-sm outline-none"
              />
              <button aria-label="Find a place" className="flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90">
                <Search className="size-4" />
                <span className="hidden sm:inline">Find a place</span>
              </button>
            </form>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                Reviewed listings
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                Clear property details
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" />
                Free to explore
              </span>
            </div>
          </div>
          <div className="relative pb-8 pl-4">
            <div className="absolute -top-5 -right-3 h-72 w-72 rounded-full bg-primary/5" />
            <div className="relative aspect-[1.05] overflow-hidden rounded-[28px]">
              <Image
                src="/bh1.jpg"
                alt="A bright two-storey boarding house with balconies and a blue roof"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="scale-125 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
              <div className="absolute bottom-16 left-7 text-white">
                <p className="text-xs font-medium tracking-[0.18em] text-white/80 uppercase">
                  Room for your next chapter
                </p>
                <p className="mt-2 text-2xl font-medium tracking-tight">
                  A space to call your own.
                </p>
              </div>
            </div>
            <div className="absolute bottom-0 -left-2 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl shadow-slate-900/5">
              <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold">
                  Discover with confidence
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Every published listing is reviewed
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y bg-card py-12">
          <div className="page-container grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Discover your space",
                text: "Browse boarding houses and compare rooms, amenities, and monthly rent.",
              },
              {
                icon: ShieldCheck,
                title: "Details you can explore",
                text: "Get a closer look with property photos, house rules, and reviewed listings.",
              },
              {
                icon: Building2,
                title: "Manage with ease",
                text: "Keep your boarding houses, rooms, and listings together in one workspace.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/7 text-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="page-container grid items-center gap-10 py-20 md:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative mt-9 aspect-[0.85] overflow-hidden rounded-2xl">
              <Image
                src="/bh2.jpeg"
                alt="Boarding house exterior"
                fill
                sizes="25vw"
                className="object-cover"
              />
            </div>
            <div className="relative mb-9 aspect-[0.85] overflow-hidden rounded-2xl">
              <Image
                src="/bh3.jpg"
                alt="A place to begin your next chapter"
                fill
                sizes="25vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className="md:pl-10">
            <span className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              For property owners
            </span>
            <h2 className="mt-4 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
              Your properties.
              <br />
              One organized workspace.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
              Spend less time keeping track and more time looking after your
              space. BoardingHub brings your property details, rooms, and
              listing reviews together.
            </p>
            <div className="my-6 space-y-3">
              {[
                {
                  icon: Building2,
                  text: "Manage your boarding houses and amenities",
                },
                {
                  icon: BedDouble,
                  text: "Keep room details and prices up to date",
                },
                {
                  icon: KeyRound,
                  text: "Publish listings through a guided review",
                },
              ].map((item) => (
                <p key={item.text} className="flex items-center gap-3 text-sm">
                  <item.icon className="size-4 text-primary" />
                  {item.text}
                </p>
              ))}
            </div>
            <LinkButton href="/register?role=owner">
              Create an owner account
              <ArrowRight className="size-4" />
            </LinkButton>
          </div>
        </section>
      </main>
      <footer className="border-t bg-card py-8">
        <div className="page-container flex flex-wrap items-center justify-between gap-5">
          <Brand />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BoardingHub. Find a place. Manage with
            ease.
          </p>
          <Link href="/listings" className="text-sm text-primary">
            Explore boarding houses →
          </Link>
        </div>
      </footer>
    </>
  )
}
