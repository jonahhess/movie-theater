"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";
import Ticket from "./Ticket";

export type TicketSession = components["schemas"]["SessionResponse"];
export type Ticket = components["schemas"]["TicketResponse"];

export default function MyTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<TicketSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTicket, setShowTicket] = useState(0);

  const loadAccountData = useCallback(async () => {
    const [ticketsResult, sessionResult] = await Promise.all([
      ticketsApiClient.GET("/api/v1/tickets/purchases"),
      ticketsApiClient.GET("/api/v1/tickets/session"),
    ]);
    setTickets(ticketsResult.data ?? []);
    setSession(sessionResult.data ?? { authenticated: false });
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.all([
      ticketsApiClient.GET("/api/v1/tickets/purchases"),
      ticketsApiClient.GET("/api/v1/tickets/session"),
    ]).then(([ticketsResult, sessionResult]) => {
      setTickets(ticketsResult.data ?? []);
      setSession(sessionResult.data ?? { authenticated: false });
      setLoading(false);
    });
  }, []);

  // Sign-out can also happen from the site header while this page is open.
  useEffect(() => {
    window.addEventListener("ticket-session-signout", loadAccountData);
    return () => {
      window.removeEventListener("ticket-session-signout", loadAccountData);
    };
  }, [loadAccountData]);

  async function handleSignOut() {
    await ticketsApiClient.POST("/api/v1/tickets/logout");
    window.dispatchEvent(new CustomEvent("ticket-session-signout"));
    router.refresh();
  }

  if (loading) return <p className="leading-7 text-foreground-muted">Loading tickets...</p>;

  const redeemed = tickets.filter(ticket => ticket.status === "redeemed");
  const unredeemed = tickets.filter(ticket => ticket.status !== "redeemed");

  return (
    <div className="space-y-6">
      {redeemed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">Redeemed Tickets</h3>
          {redeemed.map((ticket) => (
            <Ticket key={ticket.id} ticket={ticket} showTicket={showTicket} setShowTicket={setShowTicket} />
          ))}
        </div>
      )}
      {unredeemed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">Unredeemed Tickets</h3>
          {unredeemed.map((ticket) => (
            <Ticket key={ticket.id} ticket={ticket} showTicket={showTicket} setShowTicket={setShowTicket} />
          ))}
        </div>
      )}
      {!redeemed.length && !unredeemed.length && (
        <div className="rounded-2xl border border-dashed border-border bg-bg-raised p-8 text-center">
          <p className="leading-7 text-foreground-muted">No tickets found for this session.</p>
          {!session?.authenticated && (
            <p className="mt-1 text-xs text-foreground-subtle">
              Already have an account? <Link href="/tickets/login" className="font-semibold text-accent-hover hover:text-accent">Sign in</Link> to view previous bookings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
