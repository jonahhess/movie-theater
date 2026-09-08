"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";

export type TicketSession = components["schemas"]["SessionResponse"];
export type Ticket = components["schemas"]["TicketResponse"];

export function TicketAccountBar({
  session: initialSession,
  onSignOut,
}: {
  session?: TicketSession | null;
  onSignOut?: () => void;
}) {
  const router = useRouter();
  const [session, setSession] = useState<TicketSession | null>(initialSession ?? null);

  useEffect(() => {
    if (initialSession !== undefined) {
      setSession(initialSession);
      return;
    }
    void ticketsApiClient.GET("/api/v1/tickets/session").then(({ data }) => {
      setSession(data ?? { authenticated: false });
    });
  }, [initialSession]);

  async function handleSignOut() {
    await ticketsApiClient.POST("/api/v1/tickets/logout");
    setSession({ authenticated: false });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ticket-session-signout"));
    }
    onSignOut?.();
    router.refresh();
  }

  const isLoading = session === null;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-bg-raised px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isLoading
              ? "bg-foreground-subtle"
              : session.authenticated
              ? "bg-accent"
              : "bg-accent-hover"
          }`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {isLoading
              ? "Checking account..."
              : session.authenticated
              ? `Signed in as ${session.username}`
              : "Guest booking"}
          </p>
          <p className="text-xs text-foreground-subtle">
            {isLoading
              ? ""
              : session.authenticated
              ? session.email
              : "Seats held temporarily for this session."}
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Ticket account">
        <Link href="/tickets/my-tickets" className="font-semibold text-accent-hover hover:text-accent">
          My tickets
        </Link>
        {!isLoading &&
          (session.authenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-border-strong px-3 py-1.5 font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/tickets/login"
                className="rounded-full border border-border-strong px-3 py-1.5 font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
              >
                Sign in
              </Link>
              <Link
                href="/tickets/register"
                className="rounded-full bg-accent px-3 py-1.5 font-bold text-ink transition hover:bg-accent-hover"
              >
                Create account
              </Link>
            </>
          ))}
      </nav>
    </div>
  );
}

export function MyTickets() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [session, setSession] = useState<TicketSession | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function handleSignOut() {
    await ticketsApiClient.POST("/api/v1/tickets/logout");
    setSession({ authenticated: false });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ticket-session-signout"));
    }
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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);

    const emailInput = (formData.get("email") as string) || email;
    const passwordInput = (formData.get("password") as string) || password;

    const { error: loginError } = await ticketsApiClient.POST("/api/v1/tickets/login", {
      body: { email: emailInput, password: passwordInput },
    });

    setBusy(false);
    if (loginError) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/tickets/my-tickets");
    router.refresh();
  }

  return (
    <form action={submit} className="max-w-md space-y-4 rounded-2xl border border-border bg-bg-raised p-6">
      <label className="block text-sm font-medium text-foreground-muted">
        Email
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
        Password
        <input
          required
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent py-3 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
      >
        {busy ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);

    const usernameInput = (formData.get("username") as string) || username;
    const emailInput = (formData.get("email") as string) || email;
    const passwordInput = (formData.get("password") as string) || password;
    const phoneInput = (formData.get("phone") as string) || phone;

    const { error: registerError } = await ticketsApiClient.POST("/api/v1/tickets/register", {
      body: {
        username: usernameInput,
        email: emailInput,
        password: passwordInput,
        phone: phoneInput || null,
      },
    });

    setBusy(false);
    if (registerError) {
      setError("Unable to register account. Email may already be taken.");
      return;
    }
    router.push("/tickets/my-tickets");
    router.refresh();
  }

  return (
    <form action={submit} className="max-w-md space-y-4 rounded-2xl border border-border bg-bg-raised p-6">
      <label className="block text-sm font-medium text-foreground-muted">
        Username
        <input
          required
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>
      <label className="block text-sm font-medium text-foreground-muted">
        Email
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
        Password (8+ characters)
        <input
          required
          name="password"
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>
      <label className="block text-sm font-medium text-foreground-muted">
        Phone (optional)
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="555-0199"
          className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent"
        />
      </label>
      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-accent py-3 text-sm font-bold text-ink transition hover:bg-accent-hover disabled:text-foreground-subtle disabled:hover:bg-accent"
      >
        {busy ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
