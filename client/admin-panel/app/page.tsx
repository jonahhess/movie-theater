import { apiClient } from "../lib/api";

export default async function HomePage() {
  // Replace "/endpoint" with your actual path string from openapi.json
  const { data, error, response } = await apiClient.GET("/users");

  if (error || !data) {
    // Safely grab the status code by treating response as any temporarily
    const httpResponse = response as any;
    const statusCode = httpResponse?.status;

    return (
      <main className="p-8 font-sans">
        <h1 className="text-xl font-bold text-red-600 mb-4">
          Failed to load data.
        </h1>
        <div className="bg-gray-100 p-4 rounded text-black font-mono text-sm space-y-2">
          {/* Displays the literal HTTP Status Code (e.g. 404, 401, 500) */}
          <p>
            <strong>HTTP Status:</strong>{" "}
            {statusCode || "Network Connection Failed (Check Base URL)"}
          </p>

          {/* Displays the backend error response body if one exists */}
          <p>
            <strong>API Error Payload:</strong>
          </p>
          <pre className="bg-gray-200 p-2 rounded">
            {JSON.stringify(error, null, 2) || "None"}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Data Loaded Successfully!</h1>
      <pre className="bg-gray-100 p-4 rounded text-black">
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
