import { ArrowLeft, SearchX } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found — Aeosys",
  description: "This page couldn’t be found. Return to Aeosys and continue your audit.",
}

const NotFound = () => (
  <main className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-background px-5 py-16">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
    </div>
    <section className="w-full max-w-lg text-center">
      <div className="mx-auto mb-7 grid size-14 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-lg shadow-primary/5">
        <SearchX aria-hidden="true" className="size-6" />
      </div>
      <p className="font-mono text-sm font-medium tracking-widest text-primary">ERROR 404</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        This page is off the map.
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
        The link may be outdated, or this page may have moved. Your next audit is still right where
        you left it.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Aeosys
      </Link>
    </section>
  </main>
)

export default NotFound
