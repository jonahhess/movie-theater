import ResourceTablePage from "../components/ResourceTablePage";
import {
  createAdminRecord,
  deleteAdminRecord,
  updateAdminRecord,
} from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "name", label: "Name" },
  { key: "seats", label: "Seat map", editable: false, linkBasePath: "/auditoriums" },
  { key: "is_active", label: "Active", type: "boolean" as const },
  { key: "total_capacity", label: "Capacity", editable: false },
  { key: "is_accessible", label: "Accessible", editable: false },
];

export default async function AuditoriumsPage() {
  const { data = [] } = await apiClient.GET("/api/v1/admin/auditoriums");

  return (
    <ResourceTablePage
      title="Auditoriums"
      description="Manage auditorium names and availability."
      columns={columns}
      rows={data}
      onSave={updateAdminRecord.bind(null, "auditoriums")}
      onCreate={createAdminRecord.bind(null, "auditoriums")}
      onDelete={deleteAdminRecord.bind(null, "auditoriums")}
    />
  );
}