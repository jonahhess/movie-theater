import Link from "next/link";
import { MyTickets, TicketAccountBar } from "../components/TicketAccount";

export default function MyTicketsPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <TicketAccountBar />
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My tickets</h1>
            <p className="mt-2 text-slate-600">Your bookings and receipts.</p>
          </div>
          <Link href="/screenings" className="text-sm text-blue-700 underline">Browse screenings</Link>
        </div>
        <div className="mt-8"><MyTickets /></div>
      </div>
    </main>
  );
}