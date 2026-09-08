import ResourceTablePage from "../components/ResourceTablePage";
import { createAdminRecord, updateAdminRecord, deleteAdminRecord } from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "duration_minutes", label: "Minutes", type: "number" as const },
  {
    key: "rating",
    label: "Rating",
    type: "select" as const,
    options: [
      { label: "G", value: "G" },
      { label: "PG", value: "PG" },
      { label: "PG-13", value: "PG-13" },
      { label: "R", value: "R" },
    ],
  },
  { key: "release_date", label: "Release date" },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "Draft", value: "draft" },
      { label: "Now showing", value: "now_showing" },
      { label: "Archived", value: "archived" },
    ],
  },
];

export default async function MoviesPage() {
  const { data = [] } = await apiClient.GET("/api/v1/admin/movies");

  return (
    <ResourceTablePage
      title="Movies"
      description="Manage the movies available for scheduling."
      columns={columns}
      rows={data}
      onSave={updateAdminRecord.bind(null, "movies")}
      onCreate={createAdminRecord.bind(null, "movies")}
      onDelete={deleteAdminRecord.bind(null, "movies")}
    />
  );
}