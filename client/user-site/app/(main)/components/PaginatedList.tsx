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
    return (
      <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
        <p className="rounded-2xl border border-border bg-bg-raised p-6 leading-7 text-foreground-muted">
          {emptyMessage}
        </p>
      </main>
    );
  }

  const limit = data.limit > 0 ? data.limit : data.items.length || 1;
  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const currentPage = Math.min(totalPages, Math.floor(data.offset / limit) + 1);
  const previousOffset = Math.max(0, data.offset - limit);
  const nextOffset = data.offset + limit;
  const hasPreviousPage = data.offset > 0;
  const hasNextPage = nextOffset < data.total;

  return (
    <main className="mx-auto max-w-5xl bg-bg px-6 py-12 text-foreground sm:px-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Now showing</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-foreground-muted">{description}</p>

      <div className="my-8 flex flex-wrap items-center gap-4 border-y border-border py-4 text-sm">
        <span className="text-foreground-muted">
          Page {currentPage} of {totalPages}
        </span>
        <span className="text-foreground-muted">Total: {data.total}</span>

        <div className="ml-auto flex gap-2">
          {hasPreviousPage ? (
            <Link
              href={getPageHref(previousOffset)}
              className="rounded-full border border-border-strong px-4 py-1.5 font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Back
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-full border border-border-strong px-4 py-1.5 font-semibold text-foreground-subtle"
            >
              Back
            </span>
          )}
          {hasNextPage ? (
            <Link
              href={getPageHref(nextOffset)}
              className="rounded-full border border-border-strong px-4 py-1.5 font-semibold text-foreground transition hover:border-foreground hover:bg-white/10"
            >
              Forward
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-full border border-border-strong px-4 py-1.5 font-semibold text-foreground-subtle"
            >
              Forward
            </span>
          )}
        </div>
      </div>

      <div id={listId} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map(renderItem)}
      </div>
    </main>
  );
}
