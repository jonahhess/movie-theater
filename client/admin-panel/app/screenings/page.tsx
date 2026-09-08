import ResourceTablePage from "../components/ResourceTablePage";
import {
  createAdminRecord,
  deleteAdminRecord,
  closeScreeningSale,
  openScreeningSale,
  updateAdminRecord,
} from "../../lib/admin-actions";
import { apiClient } from "../../lib/api";

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "auditorium_id", label: "Auditorium ID", type: "number" as const },
  { key: "start_time", label: "Start time", type: "datetime-local" as const },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export default async function ScreeningsPage() {
  const [{ data: screenings = [] }, { data: movies = [] }, { data: auditoriums = [] }] = await Promise.all([
    apiClient.GET("/api/v1/admin/screenings"),
    apiClient.GET("/api/v1/admin/movies"),
    apiClient.GET("/api/v1/admin/auditoriums"),
  ]);
  const movieOptions = movies
    .map((movie) => ({
      label: `${movie.title} (#${movie.id})`,
      value: String(movie.id),
      group: movie.status === "now_showing" ? "Active movies" : "Inactive movies",
      badge: movie.status === "now_showing" ? "Now showing" : movie.status,
      active: movie.status === "now_showing",
    }))
    .sort((left, right) => Number(right.active) - Number(left.active) || left.label.localeCompare(right.label));
  const auditoriumOptions = auditoriums
    .map((auditorium) => ({
      label: `${auditorium.name} (#${auditorium.id})`,
      value: String(auditorium.id),
      group: auditorium.is_active ? "Active auditoriums" : "Inactive auditoriums",
      badge: auditorium.is_active ? "Active" : "Inactive",
      active: auditorium.is_active,
    }))
    .sort((left, right) => Number(right.active) - Number(left.active) || left.label.localeCompare(right.label));
  const statusOptions = [
    { label: "Draft", value: "draft" },
    { label: "Past", value: "past" },
    { label: "Cancelled", value: "cancelled" },
  ];
  const screeningColumns = [
    columns[0],
    { key: "movie_id", label: "Movie", type: "select" as const, options: movieOptions },
    { key: "auditorium_id", label: "Auditorium", type: "select" as const, options: auditoriumOptions },
    ...columns.slice(2, -1),
    { key: "status", label: "Status", type: "select" as const, options: statusOptions },
  ];

  return (
    <ResourceTablePage
      title="Screenings"
      description="Manage movie times, prices, and sale status."
      columns={screeningColumns}
      rows={screenings}
      onSave={updateAdminRecord.bind(null, "screenings")}
      onCreate={createAdminRecord.bind(null, "screenings")}
      onDelete={deleteAdminRecord.bind(null, "screenings")}
      onOpenSale={openScreeningSale}
      onCloseSale={closeScreeningSale}
    />
  );
}