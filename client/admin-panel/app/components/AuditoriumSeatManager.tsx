'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import EditableTable from "./EditableTable";
import SeatMap, { type Seat } from "./SeatMap";

type SaveResult = { error?: string } | undefined;
type SeatValues = Record<string, string>;

type GenerateConfig = {
  rowCount: number;
  seatsPerRow: number;
  rowSpacing?: number;
  seatSpacing?: number;
  accessibleRows?: string[];
};

type AuditoriumSeatManagerProps = {
  seats: Seat[];
  totalCapacity: number;
  onCreate: (values: SeatValues) => Promise<SaveResult>;
  onSave: (id: number | string, values: SeatValues) => Promise<SaveResult>;
  onDelete: (id: number | string) => Promise<SaveResult>;
  onGenerate?: (config: GenerateConfig) => Promise<SaveResult>;
};

const columns = [
  { key: "id", label: "ID", editable: false },
  { key: "row", label: "Row" },
  { key: "number", label: "Number", type: "number" as const },
  { key: "is_available", label: "Available", type: "boolean" as const },
  { key: "is_accessible", label: "Accessible", type: "boolean" as const },
  { key: "x_pos", label: "X position", type: "number" as const },
  { key: "y_pos", label: "Y position", type: "number" as const },
  { key: "angle", label: "Angle", type: "number" as const },
];

export default function AuditoriumSeatManager({
  seats,
  totalCapacity,
  onCreate,
  onSave,
  onDelete,
  onGenerate,
}: AuditoriumSeatManagerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "map">("map");
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draft, setDraft] = useState<SeatValues>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Quick layout generator state
  const [showGenerator, setShowGenerator] = useState(false);
  const [rowCount, setRowCount] = useState(6);
  const [seatsPerRow, setSeatsPerRow] = useState(8);
  const [rowSpacing, setRowSpacing] = useState(50);
  const [seatSpacing, setSeatSpacing] = useState(45);
  const [accessibleRowsInput, setAccessibleRowsInput] = useState("A");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  function toggleSelectSeat(seat: Seat) {
    if (selectedSeat?.id === seat.id) {
      cancelSeatEdit();
      return;
    }
    setSelectedSeat(seat);
    setIsCreating(false);
    setDraft({
      row: seat.row,
      number: String(seat.number),
      is_available: String(seat.is_available),
      is_accessible: String(seat.is_accessible),
      x_pos: String(seat.x_pos),
      y_pos: String(seat.y_pos),
      angle: String(seat.angle),
    });
    setError(null);
  }

  function startCreatingSeat() {
    setSelectedSeat(null);
    setIsCreating(true);
    setDraft({
      row: "",
      number: "",
      is_available: "true",
      is_accessible: "false",
      x_pos: "0",
      y_pos: "0",
      angle: "0",
    });
    setError(null);
  }

  function cancelSeatEdit() {
    setSelectedSeat(null);
    setIsCreating(false);
    setDraft({});
    setError(null);
  }

  async function saveSelectedSeat() {
    if (!selectedSeat && !isCreating) return;
    setIsSaving(true);
    setError(null);
    const result = isCreating
      ? await onCreate(draft)
      : await onSave(selectedSeat!.id, draft);
    setIsSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    cancelSeatEdit();
    router.refresh();
  }

  async function removeSelectedSeat() {
    if (!selectedSeat) return;
    setIsSaving(true);
    setError(null);
    const result = await onDelete(selectedSeat.id);
    setIsSaving(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    cancelSeatEdit();
    router.refresh();
  }

  async function handleGenerateLayout(event: React.FormEvent) {
    event.preventDefault();
    if (!onGenerate) return;
    setIsGenerating(true);
    setGeneratorError(null);

    const accessibleRows = accessibleRowsInput
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    const result = await onGenerate({
      rowCount: Number(rowCount),
      seatsPerRow: Number(seatsPerRow),
      rowSpacing: Number(rowSpacing),
      seatSpacing: Number(seatSpacing),
      accessibleRows,
    });

    setIsGenerating(false);
    if (result?.error) {
      setGeneratorError(result.error);
      return;
    }

    setShowGenerator(false);
    cancelSeatEdit();
    router.refresh();
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{seats.length} seats, {totalCapacity} total capacity</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1" role="group" aria-label="Seat view">
            <button
              type="button"
              aria-pressed={mode === "list"}
              onClick={() => setMode("list")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${mode === "list" ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              List
            </button>
            <button
              type="button"
              aria-pressed={mode === "map"}
              onClick={() => setMode("map")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${mode === "map" ? "bg-slate-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              Map
            </button>
          </div>
          {onGenerate && (
            <button
              type="button"
              onClick={() => {
                setShowGenerator(true);
                setGeneratorError(null);
              }}
              className="rounded bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Auto-generate layout
            </button>
          )}
          {mode === "map" && (
            <button
              type="button"
              onClick={startCreatingSeat}
              className="rounded bg-green-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
            >
              Add seat
            </button>
          )}
        </div>
      </div>

      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Auto-Generate Seat Layout</h3>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGenerateLayout} className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">
                Quickly spin up an auditorium grid. Note: Generating a new layout will replace any existing seats in this auditorium.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Number of rows
                  <input
                    type="number"
                    min={1}
                    max={26}
                    required
                    value={rowCount}
                    onChange={(e) => setRowCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <span className="text-[11px] text-gray-400">Rows A - {String.fromCharCode(64 + Math.min(rowCount, 26))}</span>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Seats per row
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={seatsPerRow}
                    onChange={(e) => setSeatsPerRow(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <span className="text-[11px] text-gray-400">Total {rowCount * seatsPerRow} seats</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-gray-700">
                  Row spacing (Y)
                  <input
                    type="number"
                    min={20}
                    max={150}
                    value={rowSpacing}
                    onChange={(e) => setRowSpacing(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <span className="text-[11px] text-gray-400">Default: 50px</span>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                  Seat spacing (X)
                  <input
                    type="number"
                    min={20}
                    max={150}
                    value={seatSpacing}
                    onChange={(e) => setSeatSpacing(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm"
                  />
                  <span className="text-[11px] text-gray-400">Default: 45px</span>
                </label>
              </div>

              <label className="block text-sm font-medium text-gray-700">
                Accessible rows (comma-separated)
                <input
                  type="text"
                  value={accessibleRowsInput}
                  onChange={(e) => setAccessibleRowsInput(e.target.value)}
                  placeholder="A"
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm uppercase"
                />
                <span className="text-[11px] text-gray-400">e.g. A or A, B</span>
              </label>

              {generatorError && (
                <p className="rounded bg-red-50 p-2 text-xs text-red-700" role="alert">
                  {generatorError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setShowGenerator(false)}
                  className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {isGenerating ? "Generating..." : "Generate Layout"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {mode === "list" ? (
        <EditableTable columns={columns} rows={seats} onCreate={onCreate} onSave={onSave} onDelete={onDelete} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <SeatMap seats={seats} selectedSeatId={selectedSeat?.id ?? null} onSelect={toggleSelectSeat} />
          <aside className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">{isCreating ? "New seat" : "Selected seat"}</h2>
            {!selectedSeat && !isCreating ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Select a seat on the map to edit it.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  ["row", "Row", "text"],
                  ["number", "Number", "number"],
                  ["x_pos", "X position", "number"],
                  ["y_pos", "Y position", "number"],
                  ["angle", "Angle", "number"],
                ].map(([key, label, type]) => (
                  <label key={key} className="block text-sm font-medium text-gray-700">
                    {label}
                    <input
                      type={type}
                      value={draft[key] ?? ""}
                      onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                      className="mt-1 w-full rounded border border-gray-300 p-2 font-normal"
                    />
                  </label>
                ))}
                {[
                  ["is_available", "Available"],
                  ["is_accessible", "Accessible"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={draft[key] === "true"}
                      onChange={(event) => setDraft({ ...draft, [key]: String(event.target.checked) })}
                    />
                    {label}
                  </label>
                ))}
                {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={isSaving} onClick={saveSelectedSeat} className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:bg-gray-300">
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  {selectedSeat && (
                    <button type="button" disabled={isSaving} onClick={removeSelectedSeat} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:bg-gray-300">
                      Delete
                    </button>
                  )}
                  <button type="button" disabled={isSaving} onClick={cancelSeatEdit} className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 disabled:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}