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
  { key: "tagline", label: "Tagline", editable: true },
  { key: "genre", label: "Genre" as const, options: [
    { label: "Action", value: "Action" },
    { label: "Adventure", value: "Adventure" },
    { label: "Animation", value: "Animation" },
    { label: "Comedy", value: "Comedy" },
    { label: "Crime", value: "Crime" },
    { label: "Documentary", value: "Documentary" },
    { label: "Drama", value: "Drama" },
    { label: "Fantasy", value: "Fantasy" },
    { label: "Horror", value: "Horror" },
    { label: "Mystery", value: "Mystery" },
    { label: "Romance", value: "Romance" },
    { label: "Sci-Fi", value: "Sci-Fi" },
    { label: "Thriller", value: "Thriller" },
    { label: "War", value: "War" },
    { label: "Western", value: "Western" },
    { label: "Other", value: "Other" },
  ]},
  { key: "country", label: "Country" as const, options: [
    { label: "USA", value: "USA" },
    { label: "UK", value: "UK" },
    { label: "Canada", value: "Canada" },
    { label: "Australia", value: "Australia" },
    { label: "France", value: "France" },
    { label: "Germany", value: "Germany" },
    { label: "Italy", value: "Italy" },
    { label: "Spain", value: "Spain" },
    { label: "Japan", value: "Japan" },
    { label: "South Korea", value: "South Korea" },
    { label: "India", value: "India" },
    { label: "China", value: "China" },
    { label: "Israel", value: "Israel" },
    { label: "Other", value: "Other" },
  ]},
  { key: "language", label: "Language" as const, options: [
    { label: "English", value: "English" },
    { label: "Hebrew", value: "Hebrew" },
    { label: "Arabic", value: "Arabic" },
    { label: "French", value: "French" },
    { label: "Spanish", value: "Spanish" },
    { label: "German", value: "German" },
    { label: "Italian", value: "Italian" },
    { label: "Portuguese", value: "Portuguese" },
    { label: "Russian", value: "Russian" },
    { label: "Japanese", value: "Japanese" },
    { label: "Korean", value: "Korean" },
    { label: "Chinese", value: "Chinese" },
    { label: "Hindi", value: "Hindi" },
    { label: "Other", value: "Other" },
  ]},
  { key: "director", label: "Director", editable: true },
  { key: "cast", label: "Cast", editable: true },
  { key: "trailer_url", label: "Trailer URL", editable: true },
  { key: "poster_url", label: "Poster URL", editable: true },
  { key: "backdrop_url", label: "Backdrop URL", editable: true },
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