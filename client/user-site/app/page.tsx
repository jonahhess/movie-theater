import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-bg text-foreground">
      <section className="relative isolate min-h-[720px] overflow-hidden px-6 py-6 sm:px-10 lg:px-16">
        <div className="absolute inset-0 -z-20 bg-[url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=2200&q=85')] bg-cover bg-center" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,10,15,.97)_0%,rgba(7,10,15,.78)_42%,rgba(7,10,15,.2)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,var(--color-bg)_0%,transparent_30%,rgba(13,17,23,.18)_100%)]" />

        <nav className="mx-auto flex max-w-7xl items-center justify-between" aria-label="Primary navigation">
          <Link href="/" className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg text-ink">M</span>
            Meridian Cinema
          </Link>
          <div className="flex items-center gap-5 text-sm text-white/75 sm:gap-8">
            <Link href="/movies" className="transition hover:text-white">Movies</Link>
            <Link href="/screenings" className="transition hover:text-white">Screenings</Link>
            <Link href="/tickets/my-tickets" className="transition hover:text-white">My Tickets</Link>
          </div>
        </nav>

        <div className="mx-auto flex min-h-[610px] max-w-7xl items-center">
          <div className="max-w-2xl pb-16 pt-20">
            <p className="mb-6 text-sm font-semibold uppercase tracking-wider text-accent-hover">Tonight deserves a bigger screen</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-tight text-white sm:text-7xl">
              Stories hit different in the dark.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-white/75">
              Find your next great night out, from first-run favorites to the seats everyone wants.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/screenings" className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover">
                Find screenings
              </Link>
              <Link href="/movies" className="rounded-full border border-white/35 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">
                Browse movies
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Your next night out</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Make an evening of it.</h2>
          </div>
          <Link href="/screenings" className="text-sm font-semibold text-foreground-muted underline decoration-accent underline-offset-4 hover:text-foreground">
            See all screenings
          </Link>
        </div>

        <div className="mt-9 grid gap-4 md:grid-cols-3">
          <Link href="/movies" className="group rounded-2xl border border-border bg-bg-raised p-6 transition hover:-translate-y-1 hover:border-accent/60">
            <span className="text-3xl" aria-hidden="true">01</span>
            <h3 className="mt-12 text-xl font-semibold">Pick a story</h3>
            <p className="mt-2 leading-7 text-foreground-subtle">See what is playing and find the film that fits your mood.</p>
            <span className="mt-6 inline-block text-sm font-semibold text-accent-hover">Explore movies</span>
          </Link>
          <Link href="/screenings" className="group rounded-2xl border border-border bg-accent p-6 text-ink transition hover:-translate-y-1 hover:bg-accent-hover">
            <span className="text-3xl" aria-hidden="true">02</span>
            <h3 className="mt-12 text-xl font-semibold">Choose your time</h3>
            <p className="mt-2 leading-7 text-ink/70">Find the screening that makes the rest of your evening work.</p>
            <span className="mt-6 inline-block text-sm font-bold">View screenings</span>
          </Link>
          <Link href="/tickets/my-tickets" className="group rounded-2xl border border-border bg-bg-raised p-6 transition hover:-translate-y-1 hover:border-accent/60">
            <span className="text-3xl" aria-hidden="true">03</span>
            <h3 className="mt-12 text-xl font-semibold">Keep your tickets close</h3>
            <p className="mt-2 leading-7 text-foreground-subtle">Your bookings, receipts, and plans for the big screen in one place.</p>
            <span className="mt-6 inline-block text-sm font-semibold text-accent-hover">View my tickets</span>
          </Link>
        </div>
      </section>
    </main>
  );
}