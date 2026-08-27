import createClient from "openapi-fetch";
import type { paths } from "../types/api";

export const apiClient = createClient<paths>({
  baseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/admin",
});

// Intercept requests on the fly to dynamically inject the authorization cookie
apiClient.use({
  async onRequest({ request }) {
    // Next.js runtime automatically grabs headers when called inside a server request lifecycle
    if (typeof window === "undefined") {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;

      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
    }
    return request;
  },
});
