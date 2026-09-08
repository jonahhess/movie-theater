"use client";

import { useState } from "react";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";

type TicketSession = components["schemas"]["SessionResponse"];

type BookingCheckoutProps = {
  selectedCount: number;
  session: TicketSession | null;
  onSessionChange: (session: TicketSession) => void;
  onConfirmPayment: (email: string, phone: string) => Promise<void>;
  onBackToSeats: () => void;
  busy: boolean;
};

export default function BookingCheckout({
  selectedCount,
  session,
  onSessionChange,
  onConfirmPayment,
  onBackToSeats,
  busy,
}: BookingCheckoutProps) {
  const [email, setEmail] = useState(session?.email || "");
  const [phone, setPhone] = useState("");

  const [authTab, setAuthTab] = useState<"guest" | "login" | "register">("guest");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  async function handleInlineLogin(formData: FormData) {
    setAuthBusy(true);
    setAuthError(null);

    const emailInput = (formData.get("email") as string) || loginEmail;
    const passwordInput = (formData.get("password") as string) || loginPassword;

    const { data, error: loginError } = await ticketsApiClient.POST("/api/v1/tickets/login", {
      body: { email: emailInput, password: passwordInput },
    });

    setAuthBusy(false);
    if (loginError || !data) {
      setAuthError("Invalid email or password.");
      return;
    }

    const updatedSession: TicketSession = {
      authenticated: true,
      user_id: data.user_id,
      email: data.email,
      username: data.username,
    };
    onSessionChange(updatedSession);
    setEmail(data.email || "");
    setAuthTab("guest");
  }

  async function handleInlineRegister(formData: FormData) {
    setAuthBusy(true);
    setAuthError(null);

    const usernameInput = (formData.get("username") as string) || registerUsername;
    const emailInput = (formData.get("email") as string) || registerEmail;
    const passwordInput = (formData.get("password") as string) || registerPassword;
    const phoneInput = (formData.get("phone") as string) || registerPhone;

    const { data, error: registerError } = await ticketsApiClient.POST("/api/v1/tickets/register", {
      body: {
        username: usernameInput,
        email: emailInput,
        password: passwordInput,
        phone: phoneInput || null,
      },
    });

    setAuthBusy(false);
    if (registerError || !data) {
      setAuthError("Unable to create account. That email may already be registered.");
      return;
    }

    const updatedSession: TicketSession = {
      authenticated: true,
      user_id: data.user_id,
      email: data.email,
      username: data.username,
    };
    onSessionChange(updatedSession);
    setEmail(data.email || "");
    setPhone(phoneInput || "");
    setAuthTab("guest");
  }

  async function handlePaymentSubmit(formData: FormData) {
    const emailInput = (formData.get("email") as string) || email;
    const phoneInput = (formData.get("phone") as string) || phone;
    await onConfirmPayment(emailInput, phoneInput);
  }

  return (
    <div className="max-w-lg rounded-2xl border border-border bg-bg-raised p-6">
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

      {/* Session Banner / Auth Switcher */}
      <div className="mt-4 rounded-xl bg-bg p-3 text-xs text-foreground-muted">
        {session?.authenticated ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-accent">Signed in</span> as{" "}
              <span className="font-semibold text-foreground">{session.username}</span> ({session.email})
            </div>
          </div>
        ) : (
          <div>
            <p className="font-medium text-foreground">Booking as Guest</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("guest");
                  setAuthError(null);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  authTab === "guest"
                    ? "bg-accent text-ink"
                    : "border border-border-strong text-foreground hover:border-foreground hover:bg-white/10"
                }`}
              >
                Guest checkout
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  authTab === "login"
                    ? "bg-accent text-ink"
                    : "border border-border-strong text-foreground hover:border-foreground hover:bg-white/10"
                }`}
              >
                Sign in & keep seats
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  setAuthError(null);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                  authTab === "register"
                    ? "bg-accent text-ink"
                    : "border border-border-strong text-foreground hover:border-foreground hover:bg-white/10"
                }`}
              >
                Create account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Sign In Form */}
      {!session?.authenticated && authTab === "login" && (
        <form action={handleInlineLogin} className="mt-4 space-y-4">
          <p className="text-xs text-foreground-subtle">
            Sign in to migrate and link your held seats to your account.
          </p>
          <label className="block text-sm font-medium text-foreground-muted">
            Email address
            <input
              required
              name="email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-foreground-muted">
            Password
            <input
              required
              name="password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          {authError && (
            <p className="text-xs text-accent" role="alert">
              {authError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={authBusy}
              className="flex-1 rounded-full bg-accent py-2 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
            >
              {authBusy ? "Signing in..." : "Sign in & keep seats"}
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("guest")}
              className="rounded-full border border-border-strong px-3 py-2 text-sm font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Inline Register Form */}
      {!session?.authenticated && authTab === "register" && (
        <form action={handleInlineRegister} className="mt-4 space-y-4">
          <p className="text-xs text-foreground-subtle">
            Create an account and keep your currently held seats.
          </p>
          <label className="block text-sm font-medium text-foreground-muted">
            Username
            <input
              required
              name="username"
              type="text"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              placeholder="username"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-foreground-muted">
            Email address
            <input
              required
              name="email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-foreground-muted">
            Password
            <input
              required
              name="password"
              minLength={8}
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          <label className="block text-sm font-medium text-foreground-muted">
            Phone (optional)
            <input
              name="phone"
              type="tel"
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              placeholder="555-0199"
              className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
            />
          </label>
          {authError && (
            <p className="text-xs text-accent" role="alert">
              {authError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={authBusy}
              className="flex-1 rounded-full bg-accent py-2 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
            >
              {authBusy ? "Creating..." : "Create account & keep seats"}
            </button>
            <button
              type="button"
              onClick={() => setAuthTab("guest")}
              className="rounded-full border border-border-strong px-3 py-2 text-sm font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Main Payment Form */}
      {(session?.authenticated || authTab === "guest") && (
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
              {busy ? "Confirming..." : "Confirm Booking & Pay"}
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
      )}
    </div>
  );
}
