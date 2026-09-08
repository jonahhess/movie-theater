import { apiClient } from "../../lib/api";
import Link from "next/link";

export default async function DashboardPage() {
  const [{ data: screenings = [] }, { data: movies = [] }, { data: auditoriums = [] }] = await Promise.all([
    apiClient.GET("/api/v1/admin/screenings"),
    apiClient.GET("/api/v1/admin/movies"),
    apiClient.GET("/api/v1/admin/auditoriums"),
  ]);

  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const auditoriumById = new Map(auditoriums.map((auditorium) => [auditorium.id, auditorium]));
  const now = Date.now();
  const upcomingScreenings = screenings
    .filter((screening) => new Date(screening.start_time).getTime() >= now)
    .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())
  const upcomingScreeningCount = upcomingScreenings.length;
  const upcomingScreeningPreview = upcomingScreenings
    .slice(0, 8)
    .map((screening) => {
      const movie = movieById.get(screening.movie_id);
      const startTime = new Date(screening.start_time);
      const endTime = movie
        ? new Date(startTime.getTime() + movie.duration_minutes * 60_000)
        : null;

      return { ...screening, movie, auditorium: auditoriumById.get(screening.auditorium_id), endTime };
    });

  const activeMovies = movies.filter((movie) => movie.status === "now_showing").length;
  const activeAuditoriums = auditoriums.filter((auditorium) => auditorium.is_active).length;
  const onSaleScreenings = screenings.filter((screening) => screening.status === "on_sale").length;
  const formatDateTime = (value: Date | string) =>
    new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
      typeof value === "string" ? new Date(value) : value,
    );

  return (
    <main className="min-h-full bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-blue-700">Operations</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
            <p className="mt-2 text-slate-600">A quick view of today's programming and theatre readiness.</p>
          </div>
          <Link href="/screenings" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Manage screenings
          </Link>
        </div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Overview">
          {[
            ["Upcoming screenings", upcomingScreeningCount, "Next 8 scheduled"],
            ["On sale", onSaleScreenings, "Ticket sales open"],
            ["Now showing", activeMovies, "Active movies"],
            ["Active auditoriums", activeAuditoriums, "Ready for scheduling"],
          ].map(([label, value, detail]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
              <p className="mt-1 text-xs text-slate-500">{detail}</p>
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Upcoming screenings</h2>
            <p className="mt-1 text-sm text-slate-500">The next scheduled events, ordered by start time.</p>
          </div>
          {upcomingScreeningPreview.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500">
              <p>No upcoming screenings are scheduled.</p>
              <Link href="/screenings" className="mt-2 inline-block text-sm font-medium text-blue-700 underline">
                Create a screening
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {upcomingScreeningPreview.map((screening) => (
                <div key={screening.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <Link href="/screenings" className="font-semibold text-slate-900 hover:text-blue-700">
                      {screening.movie?.title ?? `Movie #${screening.movie_id}`}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      {screening.auditorium?.name ?? `Auditorium #${screening.auditorium_id}`}
                    </p>
                  </div>
                  <div className="text-left text-sm sm:text-right">
                    <p className="font-medium text-slate-800">{formatDateTime(screening.start_time)}</p>
                    <p className="mt-1 text-slate-500">
                      Ends {screening.endTime ? formatDateTime(screening.endTime) : "Unknown"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${screening.status === "on_sale" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                    {screening.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}