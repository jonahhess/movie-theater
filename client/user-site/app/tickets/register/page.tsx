import Link from "next/link";
import { RegisterForm } from "../components/TicketAccount";

interface PageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function TicketRegisterPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;
  const loginHref = redirect ? `/tickets/login?redirect=${encodeURIComponent(redirect)}` : "/tickets/login";

  return (
    <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <Link href={loginHref} className="text-sm font-semibold text-foreground-muted underline decoration-accent underline-offset-4 hover:text-foreground">
        &larr; Back to sign in
      </Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-accent">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Create ticket account</h1>
      <p className="mt-2 mb-8 max-w-md leading-7 text-foreground-muted">
        Create an account to keep your bookings and receipts saved.
      </p>
      <RegisterForm redirectTo={redirect} />
      <p className="mt-6 text-sm leading-7 text-foreground-muted">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-accent-hover hover:text-accent">
          Sign in
        </Link>
      </p>
    </main>
  );
}
