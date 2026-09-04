import { ticketsApi } from "@/lib/api";

export default async function TicketsPage() {
  const { data: tickets, error: ticketError } = await ticketsApi.GET('/tickets/all');

  if (ticketError || !tickets || tickets.length === 0) {
    return <div>No tickets found.</div>;
  }

  return (
    <div id="tickets-list">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="mb-4">
            <h1 className="text-2xl font-bold">{ticket.email}</h1>
            <p className="text-gray-600">{ticket.receipt_number}</p>
          </div>
        ))}
      </div>
  );
}
