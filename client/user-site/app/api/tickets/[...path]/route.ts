import { NextRequest } from "next/server";

const ticketsApiUrl = (
  process.env.NEXT_PUBLIC_TICKETS_API_URL ?? "http://localhost:8000/tickets"
).replace(/\/$/, "");

async function proxy(request: NextRequest, context: RouteContext<"/api/tickets/[...path]">) {
  const { path } = await context.params;
  const upstreamUrl = new URL(`${ticketsApiUrl}/${path.join("/")}`);
  upstreamUrl.search = request.nextUrl.search;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
      "Content-Type": request.headers.get("content-type") ?? "",
      Accept: request.headers.get("accept") ?? "",
      "Last-Event-ID": request.headers.get("last-event-id") ?? "",
    },
    body: hasBody ? request.body : undefined,
    ...(hasBody ? { duplex: "half" as const } : {}),
  });

  const responseHeaders = new Headers(response.headers);
  const setCookies = response.headers.getSetCookie?.() ?? [];
  responseHeaders.delete("set-cookie");
  for (const setCookie of setCookies) {
    responseHeaders.append("set-cookie", setCookie);
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PUT = proxy;
export const PATCH = proxy;