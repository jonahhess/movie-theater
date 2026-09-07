import type { ReactNode } from "react";
import Link from "next/link";

interface PaginatedResponse<TItem> {
  total: number;
  limit: number;
  offset: number;
  items: TItem[];
}

interface PaginatedListProps<TItem> {
  data: PaginatedResponse<TItem> | undefined;
  title: string;
  description: string;
  emptyMessage: string;
  listId: string;
  getPageHref: (offset: number) => string;
  renderItem: (item: TItem) => ReactNode;
}

export function PaginatedList<TItem>({
  data,
  title,
  description,
  emptyMessage,
  listId,
  getPageHref,
  renderItem,
}: PaginatedListProps<TItem>) {
  if (!data || data.total === 0) {
    return <div>{emptyMessage}</div>;
  }

  const limit = data.limit > 0 ? data.limit : data.items.length || 1;
  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const currentPage = Math.min(totalPages, Math.floor(data.offset / limit) + 1);
  const previousOffset = Math.max(0, data.offset - limit);
  const nextOffset = data.offset + limit;
  const hasPreviousPage = data.offset > 0;
  const hasNextPage = nextOffset < data.total;

  return (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="my-4 flex items-center gap-3">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <span>Total: {data.total}</span>
        {hasPreviousPage ? (
          <Link href={getPageHref(previousOffset)}>Back</Link>
        ) : (
          <span aria-disabled="true" className="text-gray-400">
            Back
          </span>
        )}
        {hasNextPage ? (
          <Link href={getPageHref(nextOffset)}>Forward</Link>
        ) : (
          <span aria-disabled="true" className="text-gray-400">
            Forward
          </span>
        )}
      </div>
      <div id={listId}>{data.items.map(renderItem)}</div>
    </main>
  );
}