"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ticketsApiClient } from "@/lib/tickets-api-client";

export default function LoginForm({ redirectTo = "/tickets/my-tickets" }: { redirectTo?: string }) {
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
    window.dispatchEvent(new CustomEvent("ticket-session-changed"));
    router.push(redirectTo);
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