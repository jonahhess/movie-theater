// src/lib/api.ts
import createClient from "openapi-fetch";

// Import paths from both schema files
import type { paths as MainPaths } from "@/types/main-schema"; 
import type { paths as TicketPaths } from "@/types/tickets-schema"; 

// 1. Client for your Main API
export const mainApi = createClient<MainPaths>({ 
  baseUrl: process.env.NEXT_PUBLIC_MAIN_API_URL || "http://localhost:8000",
});

// 2. Client for your Tickets API
export const ticketsApi = createClient<TicketPaths>({ 
  baseUrl: process.env.NEXT_PUBLIC_TICKETS_API_URL || "http://localhost:8000/tickets",
});
