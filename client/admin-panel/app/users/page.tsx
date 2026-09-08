import ResourceTablePage from "../components/ResourceTablePage";
import {
  createAdminRecord,
  deleteAdminRecord,
  updateAdminRecord,
} from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "created_at", label: "Created", editable: false },

];

export default async function UsersPage() {
  const { data, error } = await apiClient.GET("/api/v1/admin/users");

  if (error || !data) {
    return (
      <main className="p-8">
        <h1 className="mb-2 text-2xl font-bold">Users</h1>
        <p className="text-red-700">Unable to load users. Check the admin API and database connection.</p>
      </main>
    );
  }

  return (
    <ResourceTablePage
      title="Users"
      description="Review and update registered users."
      columns={columns}
      rows={data}
      onSave={updateAdminRecord.bind(null, "users")}
      onCreate={createAdminRecord.bind(null, "users")}
      onDelete={deleteAdminRecord.bind(null, "users")}
    />
  );
}