import Link from "next/link";
import LoginForm from "../components/LoginForm";

interface PageProps {
  searchParams: Promise<{
    redirect?: string;
  }>;
}

export default async function TicketLoginPage({ searchParams }: PageProps) {
  const { redirect } = await searchParams;
  const registerHref = redirect ? `/tickets/register?redirect=${encodeURIComponent(redirect)}` : "/tickets/register";

  return (
    <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <Link href="/tickets/my-tickets" className="text-sm font-semibold text-foreground-muted underline decoration-accent underline-offset-4 hover:text-foreground">
        &larr; Back to my tickets
      </Link>
      <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-accent">Account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Sign in</h1>
      <p className="mt-2 mb-8 max-w-md leading-7 text-foreground-muted">
        Sign in to view your tickets and save holds to your account.
      </p>
      <LoginForm redirectTo={redirect} />
      <p className="mt-6 text-sm leading-7 text-foreground-muted">
        Don&apos;t have an account?{" "}
        <Link href={registerHref} className="font-semibold text-accent-hover hover:text-accent">
          Create an account
        </Link>
      </p>
    </main>
  );
}
