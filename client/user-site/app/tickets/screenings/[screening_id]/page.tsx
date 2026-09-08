import { mainApi } from "@/lib/api";
import BookingExperience from "../../components/BookingExperience";
import { TicketAccountBar } from "../../components/TicketAccount";

interface PageProps {
  params: Promise<{
    screening_id: string;
  }>;
}

export default async function ScreeningPage({ params }: PageProps) {
  // Await the params to extract the dynamic segment
  const resolvedParams = await params;
const screeningId = Number(resolvedParams.screening_id);

const { data: screening, error: screeningError } = await mainApi.GET(
  "/api/v1/screenings/{screening_id}",
  {
    params: { path: { screening_id: screeningId } },
  },
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
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
      <TicketAccountBar />
      <h1 className="text-3xl font-bold text-slate-900">Choose your seats</h1>
      <p className="mt-2 text-slate-600">Screening #{screeningId}</p>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p>
        Price: <span className="font-semibold">{screening.price}</span>
      </p>
      <p className="mt-1">
        Screening time: <span className="font-semibold">{screening.start_time}</span>
      </p>
      </div>
      <p className="sr-only">
        Viewing ID: <span className="font-mono text-blue-600">{screeningId}</span>
      </p>
      <BookingExperience screeningId={screeningId} />
      </div>
    </main>
  );
}
