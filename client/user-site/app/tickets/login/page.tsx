import Link from "next/link";
import { LoginForm, TicketAccountBar } from "../components/TicketAccount";

export default function TicketLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-xl">
        <TicketAccountBar />
        <Link href="/tickets/my-tickets" className="text-sm text-blue-700 underline">
          &larr; Back to my tickets
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Sign in to view your tickets and save holds to your account.
        </p>
        <LoginForm />
        <p className="mt-4 text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/tickets/register" className="text-blue-700 underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}