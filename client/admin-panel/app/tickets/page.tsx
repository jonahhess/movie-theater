import ResourceTablePage from "../components/ResourceTablePage";
import { deleteAdminRecord, updateAdminRecord } from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "receipt_number", label: "Receipt #", editable: false },
  { key: "screening_seat_id", label: "Seat Assignment ID", editable: false },
  { key: "email", label: "Customer Email" },
  { key: "phone", label: "Customer Phone" },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "Confirmed", value: "confirmed" },
      { label: "Redeemed", value: "redeemed" },
      { label: "Cancelled", value: "cancelled" },
    ],
  },
  { key: "purchaser_uuid", label: "Purchaser UUID", editable: false },
  { key: "created_at", label: "Purchased At", editable: false },
];

export default async function TicketsAdminPage() {
  const { data, error } = await apiClient.GET("/api/v1/admin/tickets");

  if (error || !data) {
    return (
      <main className="p-8">
        <h1 className="mb-2 text-2xl font-bold">Tickets</h1>
        <p className="text-red-700">Unable to load tickets from the admin API.</p>
      </main>
    );
  }

  return (
    <ResourceTablePage
      title="Tickets"
      description="View and manage purchased customer tickets and admission statuses."
      warning="Tickets contain financial transaction and customer confirmation data. Modifying status or customer info directly will impact customer receipts and admissions."
      columns={columns}
      rows={data}
      canAdd={false}
      onSave={updateAdminRecord.bind(null, "tickets")}
      onDelete={deleteAdminRecord.bind(null, "tickets")}
    />
  );
}
