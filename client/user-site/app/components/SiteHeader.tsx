"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ticketsApiClient } from "@/lib/tickets-api-client";
import type { components } from "@/types/tickets-schema";

type TicketSession = components["schemas"]["SessionResponse"];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<TicketSession | null>(null);

  const refreshSession = useCallback(() => {
    void ticketsApiClient.GET("/api/v1/tickets/session").then(({ data }) => {
      setSession(data ?? { authenticated: false });
    });
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession, pathname]);

  useEffect(() => {
    window.addEventListener("ticket-session-signout", refreshSession);
    window.addEventListener("ticket-session-changed", refreshSession);
    return () => {
      window.removeEventListener("ticket-session-signout", refreshSession);
      window.removeEventListener("ticket-session-changed", refreshSession);
    };
  }, [refreshSession]);

  async function handleSignOut() {
    await ticketsApiClient.POST("/api/v1/tickets/logout");
    setSession({ authenticated: false });
    window.dispatchEvent(new CustomEvent("ticket-session-signout"));
    router.refresh();
  }

  const isOnAuthPage = pathname.startsWith("/tickets/login") || pathname.startsWith("/tickets/register");
  const loginHref = isOnAuthPage ? "/tickets/login" : `/tickets/login?redirect=${encodeURIComponent(pathname)}`;

  return (
    <header className="border-b border-border bg-bg">
      <nav
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10"
        aria-label="Primary navigation"
      >
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-foreground"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg text-ink">
            M
          </span>
          Meridian Cinema
        </Link>
        <div className="flex items-center gap-5 text-sm text-foreground-muted sm:gap-8">
          <Link href="/movies" className="transition hover:text-accent-hover">
            Movies
          </Link>
          <Link href="/screenings" className="transition hover:text-accent-hover">
            Screenings
          </Link>
          <Link href="/tickets/my-tickets" className="transition hover:text-accent-hover">
            My Tickets
          </Link>
          {session?.authenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-foreground sm:inline">{session.username}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-border-strong px-4 py-1.5 text-sm font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          ) : session === null ? (
            <div className="h-9 w-20 animate-pulse rounded-full bg-bg-raised" aria-hidden="true" />
          ) : (
            <Link
              href={loginHref}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-ink transition hover:bg-accent-hover"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

