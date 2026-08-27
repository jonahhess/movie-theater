"use client"; // Required to manage state and show errors on the screen

import { useActionState } from "react";
import { loginAction } from "../../lib/auth-actions";

// We define an initial state for our action form
const initialState = { error: "" };

export default function LoginPage() {
  // useActionState handles the server action lifecycle and captures returned error states
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <main className="p-8 max-w-sm mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6 text-black">Sign In</h1>

      {/* Use the formAction wrapper instead of calling loginAction directly */}
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 font-bold mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="w-full border p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 font-bold mb-1">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            className="w-full border p-2 rounded text-black"
          />
        </div>

        {/* Render a helpful UI element if the login action returned an error */}
        {state?.error && (
          <p className="text-sm font-semibold text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isPending ? "Logging in..." : "Log In"}
        </button>
      </form>
    </main>
  );
}
