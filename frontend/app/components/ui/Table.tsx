import type { ReactNode } from "react";

// ─── Generic data table ────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, idx: number) => ReactNode;
  width?: string | number;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  rowKey,
  emptyMessage = "No records found.",
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="af-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  textAlign: "center",
                  color: "var(--text-muted)",
                  padding: 32,
                  fontSize: 13.5,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={rowKey(row)}
                className={`animate-fade-up stagger-${Math.min(idx + 1, 6)}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render
                      ? col.render(row, idx)
                      : (row as Record<string, unknown>)[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Standalone empty state ────────────────────────────────────────
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        color: "var(--text-secondary)",
      }}
    >
      <span style={{ fontSize: 40 }}>{icon}</span>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", textAlign: "center", maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
