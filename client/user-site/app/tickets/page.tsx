import { ticketsApi } from "@/lib/api";
import Link from "next/link";
  

export default async function TicketsPage() {
    const { data: tickets, error: ticketsError } = await ticketsApi.GET('/api/v1/tickets/purchases')

  if (ticketsError || !tickets || tickets.length === 0) {
    return <div>
      <p>No tickets found.</p>
      To purchase tickets, visit the page: <Link href="/screenings">Screenings</Link>.
    </div>;
  }

  return (
      <main>
        <h1>Tickets</h1>
        <p>Browse your ticket purchases.</p>
        <div id="tickets-list">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="mb-4">
              <Link href={`/tickets/${ticket.id}`}>
                <h2 className="text-2xl font-bold">{ticket.email}</h2>
                <p className="text-gray-600">{ticket.receipt_number}</p>
              </Link>
            </div>
          ))}
        </div>
      </main>
  );
}