import EditableTable, { type EditableColumn } from "./EditableTable";

type ResourceTablePageProps = {
  title: string;
  description: string;
  warning?: string;
  columns: EditableColumn[];
  rows: (Record<string, unknown> & { id: number | string })[];
  onSave: (
    id: number | string,
    values: Record<string, string>,
  ) => Promise<{ error?: string } | undefined>;
  onDelete?: (
    id: number | string,
  ) => Promise<{ error?: string } | undefined>;
  onCreate?: (
    values: Record<string, string>,
  ) => Promise<{ error?: string } | undefined>;
  onOpenSale?: (id: number | string) => Promise<{ error?: string } | undefined>;
  onCloseSale?: (id: number | string) => Promise<{ error?: string } | undefined>;
  canAdd?: boolean;
  canDelete?: boolean;
};

export default function ResourceTablePage({
  title,
  description,
  warning,
  columns,
  rows,
  onSave,
  onCreate,
  onDelete,
  onOpenSale,
  onCloseSale,
  canAdd = true,
  canDelete = true,
}: ResourceTablePageProps) {
  return (
    <main className="p-8">
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-gray-600">{description}</p>
      {rows.length === 0 && <p className="mb-4 text-gray-500">No records found.</p>}
      <EditableTable
        columns={columns}
        rows={rows}
        onSave={onSave}
        onCreate={onCreate}
        onDelete={onDelete}
        onOpenSale={onOpenSale}
        onCloseSale={onCloseSale}
        canAdd={canAdd}
        canDelete={canDelete}
        warning={warning}
      />
    </main>
  );
}