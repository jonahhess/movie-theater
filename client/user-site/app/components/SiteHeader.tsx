import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg">
      <nav
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-foreground"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg text-ink">
            M
          </span>
          Meridian Cinema
        </Link>
        <div className="flex items-center gap-5 text-sm text-foreground-muted sm:gap-8">
          <Link href="/movies" className="transition hover:text-accent-hover">
            Movies
          </Link>
          <Link href="/screenings" className="transition hover:text-accent-hover">
            Screenings
          </Link>
          <Link href="/tickets/my-tickets" className="transition hover:text-accent-hover">
            My Tickets
          </Link>
        </div>
      </nav>
    </header>
  );
}
