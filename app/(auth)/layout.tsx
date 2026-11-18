import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { Brand } from "@/components/shared"
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <Image
          src="/bh_homepage.jpg"
          alt="Two residents relaxing together in a shared boarding room"
          fill
          priority
          sizes="50vw"
          className="scale-125 object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
        <div className="absolute right-14 bottom-16 left-14 text-white">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs">
            <ShieldCheck className="size-4" />
            Your next chapter starts here
          </span>
          <h2 className="text-5xl leading-tight font-semibold tracking-tight">
            A place to belong.
            <br />A simpler way to begin.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
            Discover your next space or manage the places you share. It all
            starts with BoardingHub.
          </p>
        </div>
      </aside>
      <div className="flex flex-col bg-card">
        <header className="flex items-center justify-between gap-4 p-6 sm:p-9">
          <Brand />
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to home
          </Link>
        </header>
        <main
          id="main-content"
          className="m-auto w-full max-w-[510px] px-6 py-10 sm:px-10"
        >
          {children}
        </main>
        <footer className="p-6 text-center text-xs text-muted-foreground">
          Find a place. Manage with ease.
        </footer>
      </div>
    </div>
  )
}
