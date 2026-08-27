import createClient from "openapi-fetch";
import type { paths } from "../types/api";

export const apiClient = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000",
  // Attaches headers to every call automatically
  headers: {
    Authorization: "Bearer YOUR_GLOBAL_API_TOKEN_HERE",
  },
});
