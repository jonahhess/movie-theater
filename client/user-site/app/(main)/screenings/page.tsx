import { mainApi } from "@/lib/api";
import Link from "next/link";
import { PaginatedList } from "../components/PaginatedList";
import type { components } from "@/types/main-schema";
import formatDateTime from "@/helpers/formatDateTime";
import Accordion from "../components/Accordian";

type MovieResponse = components["schemas"]["MovieResponse"];
  
interface ScreeningsPageProps {
  searchParams: Promise<{
    limit?: string;
    offset?: string;
    movie_id?: string;
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
    const movieId = resolvedSearchParams.movie_id ? Number(resolvedSearchParams.movie_id) : undefined;

    const { data: screenings, error: screeningsError } = movieId !== undefined
      ? await mainApi.GET('/api/v1/movies/{movie_id}/screenings', {
          params: {
            path: { movie_id: movieId },
            query: { limit, offset },
          },
        })
      : await mainApi.GET('/api/v1/screenings', {
          params: {
            query: { limit, offset },
          },
        });

  if (screeningsError || !screenings) {
    return (
      <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
        <p className="rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
          No screenings found.
        </p>
      </main>
    );
  }

  const filteredMovieTitle = movieId !== undefined ? screenings.items[0]?.movie?.title : undefined;
  const filterQuery = movieId !== undefined ? `&movie_id=${movieId}` : "";
  const calculateEndTime = (startTime: string, durationMinutes?: number) =>
    new Date(new Date(startTime).getTime() + (durationMinutes ?? 0) * 60000);

  return (
      <PaginatedList
        data={screenings}
        title={filteredMovieTitle ? `Screenings for ${filteredMovieTitle}` : "Screenings"}
        description="Browse the latest movie screenings available at our theater."
        emptyMessage="No screenings found."
        listId="screenings-list"
        getPageHref={(nextOffset) => `/screenings?limit=${limit}&offset=${nextOffset}${filterQuery}`}
        renderItem={(screening) => (
          <Accordion key={screening.id} 
          summary={
            <>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              {screening.auditorium?.name}
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{screening.movie?.title}</h2>
            <div>{formatDateTime(screening.start_time)}</div>
            </>} details={<>
            <p className="mt-2 leading-7 text-foreground-subtle">{screening.movie?.description}</p>
            <dl className="mt-5 space-y-1 text-sm leading-7 text-foreground-muted">
              <div>Price: ${screening.price}</div>
              <div>Start Time:  {formatDateTime(screening.start_time)}</div>
              <div>End Time: {formatDateTime(calculateEndTime(screening.start_time, screening.movie?.duration_minutes))}</div>
              <div>Duration: {screening.movie?.duration_minutes} minutes</div>
              <div>Rating: {screening.movie?.rating}</div>
              <div>Release Date: {screening.movie?.release_date}</div>
            </dl>
            <br />
            <Link
            key={screening.id}
            href={`/tickets/screenings/${screening.id}`}
            className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover"
            > Choose Seats
            </Link>
            </>}>
          </Accordion>
            )}
      />
  );
}