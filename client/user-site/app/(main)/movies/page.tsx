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
    return (
      <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
        <p className="rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
          No movies found.
        </p>
      </main>
    );
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
          <Link
            key={movie.id}
            href={`/movies/${movie.id}`}
            className="group rounded-2xl border border-border bg-bg-raised p-6 transition hover:-translate-y-1 hover:border-accent/60"
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Film</p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">{movie.title}</h2>
            <p className="mt-2 leading-7 text-foreground-subtle">{movie.description}</p>
          </Link>
        )}
      />
  );
}