// app/movies/[movie_id]/page.tsx

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
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Movie Details</h1>
      <p className="bg-red-100 p-4 rounded border text-red-600">
        Error loading movie details.
      </p>
    </main>
  );
}

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Movie Details</h1>
      <p className="bg-gray-100 p-4 rounded border">
        Viewing ID: <span className="font-mono text-blue-600">{movieId}</span>
      </p>
      <div>Details</div>
         <p>Title: {movie?.title}</p>
         <p>Description: {movie?.description}</p>
         <p>Duration: {movie?.duration_minutes} minutes</p>
         <p>Rating: {movie?.rating}</p>
         <p>Release Date: {movie?.release_date}</p>
    </main>
  );
}
