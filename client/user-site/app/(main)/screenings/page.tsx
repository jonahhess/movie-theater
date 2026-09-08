import { mainApi } from "@/lib/api";
import Link from "next/link";
import { PaginatedList } from "../components/PaginatedList";
  
interface ScreeningsPageProps {
  searchParams: Promise<{
    limit?: string;
    offset?: string;
  }>;
}

const DEFAULT_LIMIT = 10;

function parsePaginationParam(value: string | undefined, fallback: number) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
}

export default async function ScreeningsPage({ searchParams }: ScreeningsPageProps) {
    const resolvedSearchParams = await searchParams;
    const limit = parsePaginationParam(resolvedSearchParams.limit, DEFAULT_LIMIT);
    const offset = parsePaginationParam(resolvedSearchParams.offset, 0);
    const [{ data: screenings, error: screeningsError }, { data: movies, error: moviesError }] = await Promise.all([
      mainApi.GET('/api/v1/screenings', {
        params: {
          query: {
            limit,
            offset,
          },
        },
      }),
      mainApi.GET('/api/v1/movies', {
        params: {
          query: {
            limit,
            offset,
          },
        },
      }),
    ]);

  if (screeningsError) {
    return (
      <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
        <p className="rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
          No screenings found.
        </p>
      </main>
    );
  }

  if (moviesError) {
    return (
      <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
        <p className="rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
          No movies found.
        </p>
      </main>
    );
  }

  const screeningsWithMovies = screenings.items.map(screening => {
    const movie = movies.items.find(movie => movie.id === screening.movie_id);
    return {
      ...movie,
      ...screening,
    };
  });
  return (
      <PaginatedList
        data={{ ...screenings, items: screeningsWithMovies }}
        title="Screenings"
        description="Browse the latest movie screenings available at our theater."
        emptyMessage="No screenings found."
        listId="screenings-list"
        getPageHref={(nextOffset) => `/screenings?limit=${limit}&offset=${nextOffset}`}
        renderItem={(screening) => (
          <Link
            key={screening.id}
            href={`/tickets/screenings/${screening.id}`}
            className="group rounded-2xl border border-border bg-bg-raised p-6 transition hover:-translate-y-1 hover:border-accent/60"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              {screening.auditorium?.name}
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{screening.title}</h2>
            <p className="mt-2 leading-7 text-foreground-subtle">{screening.description}</p>
            <dl className="mt-5 space-y-1 text-sm leading-7 text-foreground-muted">
              <div>Price: ${screening.price}</div>
              <div>Start Time: {screening.start_time}</div>
              <div>End Time: {screening.start_time + screening.duration_minutes}</div>
              <div>Duration: {screening.duration_minutes} minutes</div>
              <div>Rating: {screening.rating}</div>
              <div>Release Date: {screening.release_date}</div>
            </dl>
            <span className="mt-5 inline-block text-sm font-semibold text-accent-hover">
              Choose seats
            </span>
          </Link>
        )}
      />
  );
}