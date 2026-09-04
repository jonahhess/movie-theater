import { NextRequest } from "next/server";

const ticketsApiUrl =
  process.env.TICKETS_API_URL ?? "http://localhost:8000/tickets";

async function proxy(request: NextRequest, context: RouteContext<"/api/tickets/[...path]">) {
  const { path } = await context.params;
  const upstreamUrl = new URL(`${ticketsApiUrl}/${path.join("/")}`);
  upstreamUrl.search = request.nextUrl.search;

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
      "Content-Type": request.headers.get("content-type") ?? "",
    },
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PUT = proxy;
export const PATCH = proxy;