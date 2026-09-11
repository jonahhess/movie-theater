import { mainApi } from "@/lib/api";
import BookingExperience from "../../components/BookingExperience";
import formatDateTime from "@/helpers/formatDateTime";

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
    <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <h1 className="text-3xl font-semibold tracking-tight">Screening Details</h1>
      <p className="mt-6 rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
        Error loading screening details.
      </p>
    </main>
  );
}

  const { data: movie, error: movieError } = await mainApi.GET(
  "/api/v1/movies/{movie_id}", 
  { 
    params: { path: { movie_id: screening.movie_id } } 
  }
);

if (movieError || !movie) {
  return (
    <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <h1 className="text-3xl font-semibold tracking-tight">Screening Details</h1>
      <p className="mt-6 rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
        Error loading movie details.
      </p>
    </main>
  );
}

  return (
    <main className="mx-auto max-w-6xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">{screening.auditorium?.name}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Choose your seats</h1>
      <p className="mt-2 leading-7 text-foreground-muted">{movie.title}</p>
      <div className="mt-6 rounded-2xl border border-border bg-bg-raised p-6">
      <p className="leading-7 text-foreground-muted">
        Ticket Price: <span className="font-semibold text-foreground">${screening.price}</span>
      </p>
      <p className="mt-1 leading-7 text-foreground-muted"> 
      Start Time: <span className="font-semibold text-foreground">{formatDateTime(screening.start_time)}</span>
      </p>
      </div>
      <p className="sr-only">
        Viewing ID: <span className="font-mono text-accent-hover">{screeningId}</span>
      </p>
      <BookingExperience screeningId={screeningId} />
    </main>
  );
}
