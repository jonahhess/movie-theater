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
    const { data: screenings, error: screeningsError } = await mainApi.GET('/api/v1/screenings', {
      params: {
        query: {
          limit,
          offset,
        },
      },
    });

  if (screeningsError) {
    return <div>No screenings found.</div>;
  }

  return (
      <PaginatedList
        data={screenings}
        title="Screenings"
        description="Browse the latest movie screenings available at our theater."
        emptyMessage="No screenings found."
        listId="screenings-list"
        getPageHref={(nextOffset) => `/screenings?limit=${limit}&offset=${nextOffset}`}
        renderItem={(screening) => (
          <div key={screening.id} className="mb-4">
            <Link href={`/screenings/${screening.id}`}>
              <h2 className="text-2xl font-bold">{screening.movie_id}</h2>
              <p className="text-gray-600">{screening.price}</p>
            </Link>
          </div>
        )}
      />
  );
}