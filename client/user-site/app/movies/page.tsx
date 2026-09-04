import { mainApi } from "@/lib/api";
  

export default async function Movies() {
    const { data: movies, error: movieError } = await mainApi.GET('/movies');

  if (movieError || !movies || movies.total === 0) {
    return <div>No movies found.</div>;
  }
  return (
      <main>
        <h1>Movies</h1>
        <p>Browse the latest movies available at our theater.</p>
        <div id="movies-list">
          {movies.items.map((movie) => (
            <div key={movie.id} className="mb-4">
              <h2 className="text-2xl font-bold">{movie.title}</h2>
              <p className="text-gray-600">{movie.description}</p>
            </div>
          ))}
        </div>
      </main>
  );
}