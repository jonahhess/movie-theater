'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type EditableColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "boolean" | "select";
  editable?: boolean;
  options?: {
    label: string;
    value: string;
    group?: string;
    badge?: string;
    active?: boolean;
  }[];
  linkBasePath?: string;
};

type EditableRow = Record<string, unknown> & { id: number | string };

type SaveResult = { error?: string } | undefined;

type EditableTableProps = {
  columns: EditableColumn[];
  rows: EditableRow[];
  onSave: (
    id: number | string,
    values: Record<string, string>,
  ) => Promise<SaveResult>;
  onCreate?: (values: Record<string, string>) => Promise<SaveResult>;
  onDelete?: (id: number | string) => Promise<SaveResult>;
  onOpenSale?: (id: number | string) => Promise<SaveResult>;
  onCloseSale?: (id: number | string) => Promise<SaveResult>;
  canAdd?: boolean;
  canDelete?: boolean;
  warning?: string;
};

function displayValue(value: unknown) {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function inputValue(value: string, type: EditableColumn["type"]) {
  if (type !== "datetime-local" || !value) return value;

  // datetime-local inputs accept minute precision without a timezone suffix.
  return value.replace(/ seconds?$/, "").replace(/(\.\d+)?([+-]\d{2}:?\d{2}|Z)$/, "").slice(0, 16);
}

function optionGroups(options: NonNullable<EditableColumn["options"]>) {
  return options.reduce<Map<string, typeof options>>((groups, option) => {
    const group = option.group ?? "";
    const current = groups.get(group) ?? [];
    current.push(option);
    groups.set(group, current);
    return groups;
  }, new Map());
}

export default function EditableTable({
  columns,
  rows,
  onSave,
  onCreate,
  onDelete,
  onOpenSale,
  onCloseSale,
  canAdd = true,
  canDelete = true,
  warning,
}: EditableTableProps) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [hasNewRow, setHasNewRow] = useState(false);
  const [savingId, setSavingId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function draftFor(row: EditableRow) {
    return drafts[String(row.id)] ?? {};
  }

  function setDraftValue(row: EditableRow, key: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [String(row.id)]: { ...draftFor(row), [key]: value },
    }));
  }

  async function saveRow(row: EditableRow) {
    const draft = draftFor(row);
    if (Object.keys(draft).length === 0) return;

    setSavingId(row.id);
    setError(null);
    const result = row.id === "__new__"
      ? (onCreate ? await onCreate(draft) : undefined)
      : await onSave(row.id, draft);
    setSavingId(null);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.refresh();
    if (row.id === "__new__") setHasNewRow(false);

    setDrafts((current) => {
      const next = { ...current };
      delete next[String(row.id)];
      return next;
    });
  }

  const tableRows = hasNewRow ? [{ id: "__new__" }, ...rows] : rows;

  return (
    <div className="overflow-x-auto">
      {warning && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900 shadow-sm" role="alert">
          <span className="text-base font-bold">⚠️</span>
          <div>
            <p className="font-semibold">Caution when editing records in this table</p>
            <p className="mt-0.5 text-xs text-amber-800">{warning}</p>
          </div>
        </div>
      )}
      {error && (
        <p className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700" role="alert">
          {error}
        </p>
      )}
      {canAdd && onCreate && (
        <button
          type="button"
          onClick={() => setHasNewRow(true)}
          disabled={hasNewRow}
          className="mb-4 rounded bg-green-600 px-3 py-1.5 font-medium text-white enabled:hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Add row
        </button>
      )}
      <table className="min-w-full border-collapse border border-gray-200 text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="border-b border-gray-200 p-3 font-semibold">
                {column.label}
              </th>
            ))}
            <th scope="col" className="border-b border-gray-200 p-3 whitespace-nowrap">Save</th>
            {canDelete && <th scope="col" className="border-b border-gray-200 p-3 whitespace-nowrap">Delete</th>}
            {(onOpenSale || onCloseSale) && (
              <th scope="col" className="border-b border-gray-200 p-3 whitespace-nowrap">Sale</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => {
            const draft = draftFor(row);
            const isSaving = savingId === row.id;
            const isSaleOpen = row.status === "on_sale";

            return (
              <tr key={String(row.id)} className="border-b border-gray-200 last:border-0">
                {columns.map((column) => {
                  const value = draft[column.key] ?? (row.id === "__new__" ? "" : displayValue(row[column.key]));
                  const selectedOption = column.options?.find((option) => option.value === value);

                  return (
                    <td key={column.key} className="p-2 align-top">
                      {column.linkBasePath && row.id !== "__new__" ? (
                        <Link
                          href={`${column.linkBasePath}/${row.id}`}
                          className="text-blue-700 underline hover:text-blue-900"
                        >
                          {column.label}
                        </Link>
                      ) : column.editable === false || isSaleOpen ? (
                        <>
                          <span className="inline-block p-1">{displayValue(row[column.key])}</span>
                          {isSaleOpen && column.key === "status" && (
                            <p className="mt-1 text-xs text-amber-700" role="status">
                              Close sale before editing this screening.
                            </p>
                          )}
                        </>
                      ) : column.type === "boolean" ? (
                        <select
                          aria-label={`${column.label} for row ${row.id}`}
                          value={value === "Yes" || value === "true" ? "true" : "false"}
                          onChange={(event) => setDraftValue(row, column.key, event.target.value)}
                          className="w-full rounded border border-gray-300 bg-white p-1.5"
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : column.type === "select" ? (
                        <div className="min-w-40">
                          <select
                            aria-label={`${column.label} for row ${row.id}`}
                            value={value}
                            onChange={(event) => setDraftValue(row, column.key, event.target.value)}
                            className="w-full rounded border border-gray-300 bg-white p-1.5"
                          >
                            <option value="">Select...</option>
                            {[...optionGroups(column.options ?? [])].map(([group, options]) =>
                              group ? (
                                <optgroup key={group} label={group}>
                                  {options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ) : (
                                options.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))
                              ),
                            )}
                          </select>
                          {selectedOption?.badge && (
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                selectedOption.active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {selectedOption.badge}
                            </span>
                          )}
                          {selectedOption?.active === false && (
                            <p className="mt-1 text-xs text-amber-700" role="status">
                              This choice is inactive.
                            </p>
                          )}
                        </div>
                      ) : (
                        <input
                          aria-label={`${column.label} for row ${row.id}`}
                          type={column.type ?? "text"}
                          value={inputValue(value, column.type)}
                          onChange={(event) => setDraftValue(row, column.key, event.target.value)}
                          className="w-full min-w-32 rounded border border-gray-300 p-1.5"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="p-2 align-top">
                  <button
                    type="button"
                    disabled={isSaving || isSaleOpen || Object.keys(draft).length === 0}
                    onClick={() => saveRow(row)}
                    className="whitespace-nowrap rounded bg-blue-600 px-3 py-1.5 font-medium text-white enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </td>
                {canDelete && (
                  <td className="p-2 align-top">
                    <button
                      type="button"
                      disabled={isSaving || isSaleOpen || row.id === "__new__" || !onDelete}
                      onClick={async () => {
                        if (!onDelete) return;
                        const result = await onDelete(row.id);
                        if (result?.error) {
                          setError(result.error);
                          return;
                        }
                        router.refresh();
                      }}
                      className="whitespace-nowrap rounded bg-red-600 px-3 py-1.5 font-medium text-white enabled:hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Delete
                    </button>
                  </td>
                )}
                {(onOpenSale || onCloseSale) && (
                  <td className="p-2 align-top">
                    {isSaleOpen && onCloseSale ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          setSavingId(row.id);
                          const result = await onCloseSale(row.id);
                          setSavingId(null);
                          if (result?.error) {
                            setError(result.error);
                            return;
                          }
                          router.refresh();
                        }}
                        className="whitespace-nowrap rounded bg-amber-600 px-3 py-1.5 font-medium text-white disabled:bg-gray-300"
                      >
                        Close sale
                      </button>
                    ) : onOpenSale && row.status === "draft" && row.id !== "__new__" ? (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={async () => {
                          setSavingId(row.id);
                          const result = await onOpenSale(row.id);
                          setSavingId(null);
                          if (result?.error) {
                            setError(result.error);
                            return;
                          }
                          router.refresh();
                        }}
                        className="whitespace-nowrap rounded bg-emerald-600 px-3 py-1.5 font-medium text-white disabled:bg-gray-300"
                      >
                        Open sale
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}