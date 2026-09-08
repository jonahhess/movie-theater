import { NextRequest, NextResponse } from "next/server";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/admin";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/admin/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.ok) {
      const data = await response.json() as {
        access_token: string;
        expires_in_seconds: number;
      };
      const nextResponse = NextResponse.next();
      nextResponse.cookies.set("auth_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: data.expires_in_seconds,
        path: "/",
      });
      return nextResponse;
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
  redirectResponse.cookies.delete("auth_token");
  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!login(?:/|$)|api(?:/|$)|_next/static|_next/image|favicon.ico).*)",
  ],
};