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
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isLoading
              ? "bg-slate-300"
              : session.authenticated
              ? "bg-emerald-500"
              : "bg-amber-400"
          }`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {isLoading
              ? "Checking account..."
              : session.authenticated
              ? `Signed in as ${session.username}`
              : "Guest booking"}
          </p>
          <p className="text-xs text-slate-500">
            {isLoading
              ? ""
              : session.authenticated
              ? session.email
              : "Seats held temporarily for this session."}
          </p>
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm" aria-label="Ticket account">
        <Link href="/tickets/my-tickets" className="font-medium text-blue-700 hover:underline">
          My tickets
        </Link>
        {!isLoading &&
          (session.authenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/tickets/login"
                className="rounded border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                href="/tickets/register"
                className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-700"
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

  if (loading) return <p className="text-slate-600">Loading tickets...</p>;

  const redeemed = tickets.filter(ticket => ticket.status === "redeemed");
  const unredeemed = tickets.filter(ticket => ticket.status !== "redeemed");

  return (
    <div className="space-y-6">
      {redeemed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Redeemed Tickets</h3>
          {redeemed.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-slate-800">
                  Receipt #{ticket.receipt_number}
                </p>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 capitalize">
                  {ticket.status}
                </span>
              </div>
              {ticket.email && <p className="mt-2 text-xs text-slate-500">Email: {ticket.email}</p>}
            </article>
          ))}
        </div>
      )}
      {unredeemed.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-800">Unredeemed Tickets</h3>
          {unredeemed.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-slate-800">
                  Receipt #{ticket.receipt_number}
                </p>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 capitalize">
                  {ticket.status}
                </span>
              </div>
              {ticket.email && <p className="mt-2 text-xs text-slate-500">Email: {ticket.email}</p>}
            </article>
          ))}
        </div>
      )}
      {!redeemed.length && !unredeemed.length && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">No tickets found for this session.</p>
          {!session?.authenticated && (
            <p className="mt-1 text-xs text-slate-500">
              Already have an account? <Link href="/tickets/login" className="text-blue-600 underline">Sign in</Link> to view previous bookings.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        {session?.authenticated && (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </button>
        )}
        <Link href="/screenings" className="text-sm font-medium text-blue-700 underline">
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
    <form action={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          required
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          required
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
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
    <form action={submit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-slate-700">
        Username
        <input
          required
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          required
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password (8+ characters)
        <input
          required
          name="password"
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Phone (optional)
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="555-0199"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
      >
        {busy ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
