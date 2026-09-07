import { mainApi } from "@/lib/api";
import Link from "next/link";
import { PaginatedList } from "../components/PaginatedList";
  
interface MoviesPageProps {
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

export default async function MoviesPage({ searchParams }: MoviesPageProps) {
    const resolvedSearchParams = await searchParams;
    const limit = parsePaginationParam(resolvedSearchParams.limit, DEFAULT_LIMIT);
    const offset = parsePaginationParam(resolvedSearchParams.offset, 0);
    const { data: movies, error: movieError } = await mainApi.GET('/api/v1/movies', {
      params: {
        query: {
          limit,
          offset,
        },
      },
    });

  if (movieError) {
    return <div>No movies found.</div>;
  }

  return (
      <PaginatedList
        data={movies}
        title="Movies"
        description="Browse the latest movies available at our theater."
        emptyMessage="No movies found."
        listId="movies-list"
        getPageHref={(nextOffset) => `/movies?limit=${limit}&offset=${nextOffset}`}
        renderItem={(movie) => (
          <div key={movie.id} className="mb-4">
            <Link href={`/movies/${movie.id}`}>
              <h2 className="text-2xl font-bold">{movie.title}</h2>
              <p className="text-gray-600">{movie.description}</p>
            </Link>
          </div>
        )}
      />
  );
}