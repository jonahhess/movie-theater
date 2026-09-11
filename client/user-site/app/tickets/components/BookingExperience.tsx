"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";
import SeatMap, { type Seat } from "./SeatMap";
import BookingCheckout from "./BookingCheckout";

export type { Seat };

type SeatState = Seat & {
  liveStatus: "available" | "locked" | "purchased" | string;
};

type TicketSession = components["schemas"]["SessionResponse"];

export default function BookingExperience({ screeningId }: { screeningId: number }) {
  const [seats, setSeats] = useState<SeatState[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [stage, setStage] = useState<"seats" | "checkout" | "confirmed">("seats");
  const [session, setSession] = useState<TicketSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const bookingCompleted = useRef(false);
  const selectedRef = useRef<Set<number>>(new Set());
  const sessionRef = useRef<TicketSession | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Handle user signing out in the page/header: clear local selections and refresh seat map
  useEffect(() => {
    const handleSignOutEvent = async () => {
      setSelected(new Set());
      setStage("seats");

      const [seatResult, sessionResult] = await Promise.all([
        ticketsApiClient.GET("/api/v1/tickets/screenings/{screening_id}/seat-map", {
          params: { path: { screening_id: screeningId } },
        }),
        ticketsApiClient.GET("/api/v1/tickets/session"),
      ]);

      if (seatResult.data) {
        setSeats(
          seatResult.data.map((seat) => ({
            ...seat,
            id: seat.seat_id,
            liveStatus: seat.status,
          }))
        );
      }
      if (sessionResult.data) {
        setSession(sessionResult.data);
        sessionRef.current = sessionResult.data;
      }
    };

    window.addEventListener("ticket-session-signout", handleSignOutEvent);
    return () => {
      window.removeEventListener("ticket-session-signout", handleSignOutEvent);
    };
  }, [screeningId]);

  // Load seats, existing holds, and user session
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [seatResult, sessionResult, userSeatsResult] = await Promise.all([
        ticketsApiClient.GET("/api/v1/tickets/screenings/{screening_id}/seat-map", {
          params: { path: { screening_id: screeningId } },
        }),
        ticketsApiClient.GET("/api/v1/tickets/session"),
        ticketsApiClient.GET("/api/v1/tickets/screenings/{screening_id}/seats", {
          params: { path: { screening_id: screeningId } },
        }),
      ]);

      if (cancelled) return;

      if (seatResult.data) {
        setSeats(
          seatResult.data.map((seat) => ({
            ...seat,
            id: seat.seat_id,
            liveStatus: seat.status,
          }))
        );
      } else {
        setError("Seat availability could not be loaded.");
      }

      if (sessionResult.data) {
        setSession(sessionResult.data);
        sessionRef.current = sessionResult.data;
      }

      // Restore any seats already held by this user/session
      if (userSeatsResult.data && userSeatsResult.data.length > 0) {
        const heldSeatIds = new Set(
          userSeatsResult.data
            .map((key) => {
              const parts = key.split("::");
              return Number(parts[parts.length - 1]);
            })
            .filter((id) => !Number.isNaN(id))
        );
        setSelected(heldSeatIds);
      }

      setLoading(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [screeningId]);

  // Clean up held seats ONLY for guests when closing browser window/tab
  useEffect(() => {
    const releaseGuestSeats = () => {
      if (
        bookingCompleted.current ||
        selectedRef.current.size === 0 ||
        sessionRef.current?.authenticated
      ) {
        return;
      }

      const endpoint = "/api/tickets/api/v1/tickets/release_seats";
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(endpoint);
      } else {
        void fetch(endpoint, {
          method: "POST",
          credentials: "include",
          keepalive: true,
        });
      }
    };

    const handleBeforeUnload = () => releaseGuestSeats();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // SSE Stream for live seat availability updates
  useEffect(() => {
    const stream = new EventSource(
      `/api/tickets/api/v1/tickets/screenings/${screeningId}/availability/stream`
    );
    stream.addEventListener("seat_update", (event) => {
      const update = JSON.parse(event.data) as {
        seat_id: string;
        status: SeatState["liveStatus"];
        owner_tag?: string;
      };
      const seatId = Number(update.seat_id);
      const isMine = Boolean(
        update.owner_tag &&
        sessionRef.current?.owner_tag &&
        update.owner_tag === sessionRef.current.owner_tag
      );

      setSeats((current) =>
        current.map((seat) =>
          seat.id === seatId ? { ...seat, liveStatus: update.status } : seat
        )
      );

      setSelected((current) => {
        const next = new Set(current);
        if (update.status === "locked") {
          if (isMine) {
            next.add(seatId);
          } else {
            next.delete(seatId);
          }
        } else if (update.status === "available" || update.status === "purchased") {
          next.delete(seatId);
        }
        return next;
      });
    });
    return () => stream.close();
  }, [screeningId]);

  const mapSeats = useMemo(
    () => seats.map((seat) => ({ ...seat, is_available: seat.liveStatus === "available" })),
    [seats]
  );

  async function selectSeat(seat: Seat) {
    const current = seats.find((item) => item.id === seat.id);
    if (!current || busy || current.liveStatus === "purchased") return;

    setBusy(true);
    setError(null);
    const isSelected = selected.has(current.id);

    const result = isSelected
      ? await ticketsApiClient.DELETE(
          "/api/v1/tickets/screenings/{screening_id}/seats/{seat_id}/hold",
          { params: { path: { screening_id: screeningId, seat_id: String(current.seat_id) } } }
        )
      : await ticketsApiClient.POST(
          "/api/v1/tickets/screenings/{screening_id}/seats/{seat_id}/hold",
          { params: { path: { screening_id: screeningId, seat_id: String(current.seat_id) } } }
        );

    setBusy(false);
    if (result.error || !result.data) {
      setError(
        isSelected ? "Seat could not be released." : "Seat was just taken. Please choose another."
      );
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(current.id);
      else next.add(current.id);
      return next;
    });

    setSeats((prev) =>
      prev.map((item) =>
        item.id === current.id
          ? { ...item, liveStatus: isSelected ? "available" : "locked" }
          : item
      )
    );
  }

  async function continueToCheckout() {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);

    const { data, error: checkoutError } = await ticketsApiClient.POST(
      "/api/v1/tickets/screenings/{screening_id}/seats/checkout",
      { params: { path: { screening_id: screeningId } } }
    );
    setBusy(false);

    if (checkoutError || !data) {
      setError("Seat hold could not be extended. Please try again.");
      return;
    }
    setStage("checkout");
  }

  async function confirmPayment(email: string, phone: string) {
    setBusy(true);
    setError(null);

    const { data, error: paymentError } = await ticketsApiClient.POST(
      "/api/v1/tickets/screenings/{screening_id}/checkout/payment",
      {
        params: { path: { screening_id: screeningId } },
        body: { email, phone },
      }
    );
    setBusy(false);

    if (paymentError || !data) {
      setError("Payment could not be completed. Your hold may have expired.");
      return;
    }

    bookingCompleted.current = true;
    setStage("confirmed");
  }

  if (loading) return <p className="mt-8 leading-7 text-foreground-muted">Loading seat map...</p>;

  if (stage === "confirmed") {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-accent p-6 text-ink">
        <h2 className="text-xl font-semibold tracking-tight">Booking Confirmed!</h2>
        <p className="mt-2 text-sm leading-7 text-ink/70">Your tickets have been reserved and receipt generated.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/tickets/my-tickets"
            className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-accent transition hover:opacity-90"
          >
            View My Tickets
          </Link>
          <Link
            href="/screenings"
            className="rounded-full border border-ink/35 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-ink/10"
          >
            Browse More Screenings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-6">
      {error && (
        <div className="rounded-2xl border border-border bg-bg-raised p-4 text-sm text-accent" role="alert">
          {error}
        </div>
      )}

      {stage === "seats" ? (
        <>
          <SeatMap seats={mapSeats} selectedSeatIds={selected} onSelect={selectSeat} />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-bg-raised p-6">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {selected.size} seat{selected.size === 1 ? "" : "s"} selected
              </p>
              <p className="text-xs text-foreground-subtle">Click available seats to reserve them.</p>
            </div>
            <button
              type="button"
              disabled={busy || selected.size === 0}
              onClick={continueToCheckout}
              className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
            >
              Continue to Checkout
            </button>
          </div>
        </>
      ) : (
        <BookingCheckout
          selectedCount={selected.size}
          session={session}
          onSessionChange={(updated) => {
            setSession(updated);
            sessionRef.current = updated;
          }}
          onConfirmPayment={confirmPayment}
          onBackToSeats={() => setStage("seats")}
          busy={busy}
          timeLeft={600000}
        />
      )}
    </section>
  );
}