"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";
import QRCodeGenerator from "./QRCodeGenerator";

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
            <article key={ticket.id} className="rounded-2xl border border-border bg-bg-raised p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-accent-hover">
                  Receipt #{ticket.receipt_number}
                </p>
                <span className="inline-flex rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground-subtle capitalize">
                  {ticket.status}
                </span>
              </div>
              {ticket.email && <p className="mt-2 text-xs text-foreground-subtle">Email: {ticket.email}</p>}
            </article>
          ))}
        </div>
      )}
      {unredeemed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-accent">Unredeemed Tickets</h3>
          {unredeemed.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl border border-border bg-bg-raised p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-accent-hover">
                  Receipt #{ticket.receipt_number}
                </p>
                <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-ink capitalize">
                  {ticket.status}
                </span>
              </div>
              {ticket.email && <p className="mt-2 text-xs text-foreground-subtle">Email: {ticket.email}</p>}
              <br />
              {showTicket === ticket.id && <QRCodeGenerator text={ticket.id} />}
              <button onClick={() => setShowTicket(ticket.id === showTicket ? 0 : ticket.id)} className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover">{showTicket === ticket.id ? "Hide QR Code" : "Show QR Code"}</button>
            </article>
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

      <div className="flex items-center gap-4 pt-2">
        {session?.authenticated && (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
          >
            Sign out
          </button>
        )}
        <Link href="/screenings" className="text-sm font-semibold text-foreground-muted underline decoration-accent underline-offset-4 hover:text-foreground">
          Browse screenings
        </Link>
      </div>
    </div>
  );
}
