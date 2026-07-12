/**
 * Pagination — reusable page navigator.
 *
 * Usage:
 *   <Pagination page={page} totalPages={totalPages} onChange={setPage} />
 *
 * The component shows at most 7 page buttons with ellipsis for large ranges.
 */

interface PaginationProps {
  page: number;            // 1-based current page
  totalPages: number;
  onChange: (page: number) => void;
  /** Optional: total item count to display "X – Y of Z" info text */
  total?: number;
  pageSize?: number;
}

export function Pagination({ page, totalPages, onChange, total, pageSize }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build the page number array with ellipsis markers (-1)
  function buildPages(): (number | -1)[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | -1)[] = [1];
    if (page > 3) pages.push(-1);
    const start = Math.max(2, page - 1);
    const end   = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push(-1);
    pages.push(totalPages);
    return pages;
  }

  const pages = buildPages();

  // Info text: "1 – 10 of 47"
  let info: string | null = null;
  if (total !== undefined && pageSize !== undefined) {
    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, total);
    info = `${from}–${to} of ${total}`;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
      {/* Info text or empty spacer */}
      <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 80 }}>
        {info ?? `Page ${page} of ${totalPages}`}
      </span>

      {/* Page buttons */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {/* Prev */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: "4px 10px", fontSize: 12.5 }}
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          ‹ Prev
        </button>

        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`ellipsis-${i}`} style={{ padding: "0 4px", color: "var(--text-muted)", fontSize: 12.5 }}>
              …
            </span>
          ) : (
            <button
              key={p}
              className="btn btn-sm"
              style={{
                padding: "4px 10px",
                fontSize: 12.5,
                background: p === page ? "var(--primary)" : "transparent",
                color:      p === page ? "#fff"          : "var(--text-secondary)",
                border:     p === page ? "1px solid var(--primary)" : "1px solid transparent",
                fontWeight: p === page ? 600 : 400,
              }}
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ padding: "4px 10px", fontSize: 12.5 }}
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

/** Small hook — returns the slice of an array for the current page */
export function usePagination<T>(items: T[], pageSize: number, page: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
