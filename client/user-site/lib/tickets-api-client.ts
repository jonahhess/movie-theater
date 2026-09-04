"use client";

import createClient from "openapi-fetch";

import type { paths as TicketPaths } from "@/types/tickets-schema";

export const ticketsApiClient = createClient<TicketPaths>({
  baseUrl: "/api/tickets",
  credentials: "include",
});