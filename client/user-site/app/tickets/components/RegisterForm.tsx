"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ticketsApiClient } from "@/lib/tickets-api-client";

export default function RegisterForm({ redirectTo = "/tickets/my-tickets" }: { redirectTo?: string }) {
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
    window.dispatchEvent(new CustomEvent("ticket-session-changed"));
    router.push(redirectTo);
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