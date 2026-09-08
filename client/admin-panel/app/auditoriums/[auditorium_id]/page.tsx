import Link from "next/link";
import AuditoriumSeatManager from "../../components/AuditoriumSeatManager";
import { createSeat, deleteSeat, generateSeatLayout, updateSeat } from "../../../lib/admin-actions";
import { apiClient } from "../../../lib/api";

type AuditoriumPageProps = {
  params: Promise<{ auditorium_id: string }>;
};

export default async function AuditoriumSeatMapPage({ params }: AuditoriumPageProps) {
  const { auditorium_id: auditoriumId } = await params;
  const auditoriumNumber = Number(auditoriumId);
  const { data, error } = await apiClient.GET(
    "/api/v1/admin/auditoriums/{auditorium_id}/seats",
    { params: { path: { auditorium_id: auditoriumNumber } } },
  );

  if (error || !data) {
    return (
      <main className="p-8">
        <p className="text-red-700">Unable to load this seat map.</p>
        <Link href="/auditoriums" className="mt-4 inline-block text-blue-700 underline">
          Back to auditoriums
        </Link>
      </main>
    );
  }

  return (
    <main className="p-8">
      <Link href="/auditoriums" className="text-blue-700 underline">
        Back to auditoriums
      </Link>
      <h1 className="mb-2 mt-4 text-2xl font-bold">{data.name} seat map</h1>
      <p className="mb-6 text-gray-600">
        {data.seats.length} seats, {data.total_capacity} total capacity
      </p>
      {data.seats.length === 0 && <p className="mb-4">No seats found. Add the first seat below.</p>}
      <AuditoriumSeatManager
        seats={data.seats}
        totalCapacity={data.total_capacity}
        onCreate={createSeat.bind(null, auditoriumNumber)}
        onSave={updateSeat.bind(null, auditoriumNumber)}
        onDelete={deleteSeat.bind(null, auditoriumNumber)}
        onGenerate={generateSeatLayout.bind(null, auditoriumNumber)}
      />
    </main>
  );
}