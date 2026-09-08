import Link from "next/link";
import { RegisterForm, TicketAccountBar } from "../components/TicketAccount";

export default function TicketRegisterPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-xl">
        <TicketAccountBar />
        <Link href="/tickets/login" className="text-sm text-blue-700 underline">
          &larr; Back to sign in
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Create ticket account</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">
          Create an account to keep your bookings and receipts saved.
        </p>
        <RegisterForm />
        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/tickets/login" className="text-blue-700 underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}