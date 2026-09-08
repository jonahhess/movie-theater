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
    return <div>No screenings found.</div>;
  }

  if (moviesError) {
    return <div>No movies found.</div>;
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
          <div key={screening.id} className="mb-4">
            <Link href={`/tickets/screenings/${screening.id}`}>
              <h2 className="text-2xl font-bold">Title: {screening.title}</h2>
              <p className="text-gray-600">Price: ${screening.price}</p>
              <p className="text-gray-600">Description: {screening.description}</p>
              <p className="text-gray-600">Start Time: {screening.start_time}</p>
              <p className="text-gray-600">End Time: {screening.start_time + screening.duration_minutes}</p>
              <p className="text-gray-600">Duration: {screening.duration_minutes} minutes</p>
              <p className="text-gray-600">Rating: {screening.rating}</p>
              <p className="text-gray-600">Release Date: {screening.release_date}</p>
              <p className="text-gray-600">Auditorium: {screening.auditorium?.name}</p>
            </Link>
          </div>
        )}
      />
  );
}