// app/movies/[movie_id]/page.tsx

import Link from "next/link";
import { mainApi } from "@/lib/api";

interface PageProps {
  params: Promise<{
    movie_id: string;
  }>;
}

export default async function MoviePage({ params }: PageProps) {
  // Await the params to extract the dynamic segment
  const resolvedParams = await params;
const movieId = Number(resolvedParams.movie_id);

const { data: movie, error: movieError } = await mainApi.GET(
  "/api/v1/movies/{movie_id}",
  {
    params: {
      path: {
        movie_id: movieId,
      },
    },
  }
);  

if (movieError || !movie) {
  return (
    <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <h1 className="text-3xl font-semibold tracking-tight">Movie Details</h1>
      <p className="mt-6 rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
        Error loading movie details.
      </p>
    </main>
  );
}

  return (
  <main className="mx-auto max-w-xl bg-bg px-6 py-12 text-foreground sm:px-10">
    <p className="text-sm font-semibold uppercase tracking-wide text-accent">Now playing</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{movie?.title}</h1>

    <div className="mt-8 rounded-2xl border border-border bg-bg-raised p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Details</p>
      <p className="mt-4 leading-7 text-foreground-muted">{movie?.description}</p>
      <dl className="mt-6 space-y-2 leading-7 text-foreground-muted">
        <div>Duration: {movie?.duration_minutes} minutes</div>
        <div>Rating: {movie?.rating}</div>
        <div>Release Date: {movie?.release_date}</div>
      </dl>
    </div>

    <Link
      href={`/screenings?movie_id=${movieId}`}
      className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-bold text-ink transition hover:bg-accent-hover"
    >
      View Screenings
    </Link>
  </main>
);
}
