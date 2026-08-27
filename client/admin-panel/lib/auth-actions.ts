"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiClient } from "../lib/api";

// Add the 'prevState' parameter as the first argument to satisfy the hook signature
export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await apiClient.POST("/", {
    body: { email, password },
  });

  if (error || !data) {
    return { error: "Invalid credentials" };
  }

  const token = data.access_token;

  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  redirect("/dashboard");
}
