// app/screenings/[screening_id]/page.tsx

import { ticketsApi } from "@/lib/api";

interface PageProps {
  params: Promise<{
    screening_id: string;
  }>;
}

export default async function ScreeningPage({ params }: PageProps) {
  // Await the params to extract the dynamic segment
  const resolvedParams = await params;
const screeningId = Number(resolvedParams.screening_id);

const { data: screening, error: screeningError } = await ticketsApi.GET(
  "/api/v1/tickets/screenings/{screening_id}/availability/stream",
  {
    params: {
      path: {
        screening_id: screeningId,
      },
    },
  }
);  

if (screeningError || !screening) {
  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Screening Details</h1>
      <p className="bg-red-100 p-4 rounded border text-red-600">
        Error loading screening details.
      </p>
    </main>
  );
}

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Screening Details</h1>
      <p className="bg-gray-100 p-4 rounded border">
        Viewing ID: <span className="font-mono text-blue-600">{screeningId}</span>
      </p>
      <div>Details</div>
    </main>
  );
}
