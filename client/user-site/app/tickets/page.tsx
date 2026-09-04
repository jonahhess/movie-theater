"use client";

import { useEffect, useState } from "react";

import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";

type Ticket = components["schemas"]["TicketResponse"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    async function loadTickets() {
      const { data } = await ticketsApiClient.GET("/tickets/all");
      setTickets(data ?? []);
      setHasLoaded(true);
    }

    void loadTickets();
  }, []);

  if (!hasLoaded || tickets.length === 0) {
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
