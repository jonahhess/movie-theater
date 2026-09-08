import Link from "next/link";
import { MyTickets } from "../components/TicketAccount";

export default function MyTicketsPage() {
  return (
    <main className="mx-auto max-w-3xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Your night out</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">My tickets</h1>
          <p className="mt-2 leading-7 text-foreground-muted">Your bookings and receipts.</p>
        </div>
        <Link href="/screenings" className="text-sm font-semibold text-foreground-muted underline decoration-accent underline-offset-4 hover:text-foreground">
          Browse screenings
        </Link>
      </div>
      <div className="mt-8"><MyTickets /></div>
    </main>
  );
}
