import ResourceTablePage from "../components/ResourceTablePage";
import { deleteAdminRecord, updateAdminRecord } from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "screening_id", label: "Screening ID", editable: false },
  { key: "seat_id", label: "Seat ID", editable: false },
  { key: "is_taken", label: "Occupied / Taken", type: "boolean" as const },
  { key: "created_at", label: "Created At", editable: false },
];

export default async function ScreeningSeatsAdminPage() {
  const { data, error } = await apiClient.GET("/api/v1/admin/screening-seats");

  if (error || !data) {
    return (
      <main className="p-8">
        <h1 className="mb-2 text-2xl font-bold">Screening Seats</h1>
        <p className="text-red-700">Unable to load screening seats from the admin API.</p>
      </main>
    );
  }

  return (
    <ResourceTablePage
      title="Screening Seats"
      description="Monitor physical seat allocations and availability flags across screenings."
      warning="Screening seats represent live inventory allocations. Manually modifying occupancy flags can desynchronize seat locks or lead to double bookings."
      columns={columns}
      rows={data}
      canAdd={false}
      onSave={updateAdminRecord.bind(null, "screening-seats")}
      onDelete={deleteAdminRecord.bind(null, "screening-seats")}
    />
  );
}
