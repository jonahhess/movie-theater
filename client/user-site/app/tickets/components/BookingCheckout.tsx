"use client";

import { useState } from "react";
import type { components } from "@/types/tickets-schema";
import CountdownTimer from "./CountdownTimer";

type TicketSession = components["schemas"]["SessionResponse"];

type BookingCheckoutProps = {
  selectedCount: number;
  session: TicketSession | null;
  onSessionChange: (session: TicketSession) => void;
  onConfirmPayment: (email: string, phone: string) => Promise<void>;
  onBackToSeats: () => void;
  busy: boolean;
  timeLeft: number;
};

export default function BookingCheckout({
  selectedCount,
  session,
  onConfirmPayment,
  onBackToSeats,
  busy,
  timeLeft,
}: BookingCheckoutProps) {
  const [email, setEmail] = useState(session?.email || "");
  const [phone, setPhone] = useState("");


  async function handlePaymentSubmit(formData: FormData) {
    const emailInput = (formData.get("email") as string) || email;
    const phoneInput = (formData.get("phone") as string) || phone;
    await onConfirmPayment(emailInput, phoneInput);
  }

  return (
    <div className="max-w-lg rounded-2xl border border-border bg-bg-raised p-6">
      <CountdownTimer initTime={timeLeft} onTimeOut={onBackToSeats} />
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Checkout</h2>
          <p className="text-xs text-foreground-subtle">
            {selectedCount} seat{selectedCount === 1 ? "" : "s"} held
          </p>
        </div>
        <button
          type="button"
          onClick={onBackToSeats}
          className="text-xs font-semibold text-accent-hover hover:text-accent"
        >
          Back to seats
        </button>
      </div>
        <form action={handlePaymentSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-foreground-muted">
            Email address
            <input
              required
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>

          <label className="block text-sm font-medium text-foreground-muted">
            Phone number (optional)
            <input
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-0199"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-full bg-accent py-3 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
            >
              {busy ? "Confirming..." : "Book " + selectedCount + " Seats"}
            </button>
            <button
              type="button"
              onClick={onBackToSeats}
              className="rounded-full border border-border-strong px-4 py-3 text-sm font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
    </div>
  );
}
