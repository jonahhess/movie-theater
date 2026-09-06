import { mainApi } from "@/lib/api";
import Link from "next/link";
  

export default async function ScreeningsPage() {
    const { data: screenings, error: screeningsError } = await mainApi.GET('/api/v1/screenings');

  if (screeningsError || !screenings || screenings.total === 0) {
    return <div>No screenings found.</div>;
  }

  return (
      <main>
        <h1>Screenings</h1>
        <p>Browse the latest movie screenings available at our theater.</p>
        <div id="screenings-list">
          {screenings.items.map((screening) => (
            <div key={screening.id} className="mb-4">
              <Link href={`/screenings/${screening.id}`}>
                <h2 className="text-2xl font-bold">{screening.movie_id}</h2>
                <p className="text-gray-600">{screening.price}</p>
              </Link>
            </div>
          ))}
        </div>
      </main>
  );
}