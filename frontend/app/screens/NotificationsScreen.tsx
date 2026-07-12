"use client";

import { useState, useEffect, useCallback } from "react";
import { notifications as notifApi, activityLogs } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/Spinner";
import type { Notification, NotificationType, ActivityItem } from "../lib/types";



type FilterType = "all" | "alerts" | "approvals" | "bookings";

const TYPE_FILTER_MAP: Record<FilterType, NotificationType[]> = {
  all:       [],
  alerts:    ["overdue_return", "audit_discrepancy"],
  approvals: ["maintenance_approved", "maintenance_rejected", "transfer_approved", "transfer_rejected"],
  bookings:  ["booking_confirmed", "booking_cancelled", "booking_reminder"],
};

const NOTIF_DOT: Record<string, string> = {
  asset_assigned:       "var(--accent)",
  maintenance_approved: "var(--accent)",
  maintenance_rejected: "var(--danger)",
  booking_confirmed:    "var(--info)",
  booking_cancelled:    "var(--danger)",
  booking_reminder:     "var(--info)",
  transfer_approved:    "var(--accent)",
  transfer_rejected:    "var(--danger)",
  overdue_return:       "var(--warning)",
  audit_discrepancy:    "var(--warning)",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface NotificationsScreenProps {
  onUnreadChange: (n: number) => void;
}

export function NotificationsScreen({ onUnreadChange }: NotificationsScreenProps) {
  const { toast } = useToast();

  const [notifs,   setNotifs]  = useState<Notification[]>([]);
  const [logs,     setLogs]    = useState<ActivityItem[]>([]);
  const [loading,  setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [tab,      setTab]     = useState<"notifications" | "logs">("notifications");
  const [filter,   setFilter]  = useState<FilterType>("all");
  const [logFilter, setLogFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      // Fetch notifications — always available to all authenticated users
      const nRes = await notifApi.list();
      // Backend returns { notifications: [...], unread_count: N }
      const notifData: Notification[] = nRes.data?.notifications ?? [];
      setNotifs(notifData);
      onUnreadChange(nRes.data?.unread_count ?? notifData.filter((n) => !n.is_read).length);

      // Activity logs are admin/asset_manager only — silently skip on 403
      try {
        const lRes = await activityLogs.list();
        setLogs(Array.isArray(lRes.data) ? lRes.data : []);
      } catch {
        setLogs([]); // non-admin users get a 403 — just show empty logs
      }
    } catch (err) {
      console.error("Notifications load error:", err);
      setApiError(true);
      toast("Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Mark read ──────────────────────────────────────────────────
  async function markRead(id: string) {
    try {
      await notifApi.markRead(id);
    } catch { /* offline */ }
    setNotifs((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, is_read: true } : n);
      onUnreadChange(updated.filter((n) => !n.is_read).length);
      return updated;
    });
  }

  async function markAllRead() {
    try {
      await notifApi.markAllRead();
      toast("All notifications marked as read");
    } catch { /* offline */ }
    setNotifs((prev) => {
      const updated = prev.map((n) => ({ ...n, is_read: true }));
      onUnreadChange(0);
      return updated;
    });
  }

  async function deleteNotif(id: string) {
    try {
      await notifApi.remove(id);
    } catch { /* offline */ }
    setNotifs((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      onUnreadChange(updated.filter((n) => !n.is_read).length);
      return updated;
    });
  }

  // ─── Filter notifs ───────────────────────────────────────────────
  const displayNotifs = notifs.filter((n) => {
    if (filter === "all") return true;
    return TYPE_FILTER_MAP[filter].includes(n.type);
  });

  // ─── Filter logs ─────────────────────────────────────────────────
  const displayLogs = logFilter === "all"
    ? logs
    : logs.filter((l) => l.entity_type === logFilter);

  const entityTypes = ["all", ...Array.from(new Set(logs.map((l) => l.entity_type)))];

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div className="animate-fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Notifications &amp; Activity
        </h1>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* Main tab */}
      <div className="tab-bar" style={{ marginBottom: 20, marginTop: 16 }}>
        <button
          className={`tab-btn${tab === "notifications" ? " active" : ""}`}
          onClick={() => setTab("notifications")}
        >
          Notifications
          {unreadCount > 0 && (
            <span style={{ marginLeft: 6, background: "var(--danger)", color: "#fff", borderRadius: "99px", fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>
              {unreadCount}
            </span>
          )}
        </button>
        <button
          className={`tab-btn${tab === "logs" ? " active" : ""}`}
          onClick={() => setTab("logs")}
        >
          Activity Logs
        </button>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong>{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>Retry</button>
        </div>
      ) : tab === "notifications" ? (
        <>
          {/* Filter chips */}
          <div className="tab-bar" style={{ marginBottom: 16, gap: 6 }}>
            {(["all", "alerts", "approvals", "bookings"] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`tab-btn${filter === f ? " active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: "4px 0" }}>
            {displayNotifs.length === 0 ? (
              <p style={{ padding: "28px 20px", color: "var(--text-muted)", margin: 0, fontSize: 13.5, textAlign: "center" }}>
                No notifications.
              </p>
            ) : (
              displayNotifs.map((n, i) => (
                <div
                  key={n.id}
                  className={`activity-item animate-fade-up stagger-${Math.min(i+1,6)}`}
                  style={{
                    padding: "12px 20px",
                    background: n.is_read ? "transparent" : "var(--accent-light)",
                    cursor: n.is_read ? "default" : "pointer",
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  {/* Unread dot */}
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: n.is_read ? "var(--border-strong)" : (NOTIF_DOT[n.type] ?? "var(--accent)"),
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13.5, fontWeight: n.is_read ? 400 : 600 }}>
                      {n.message}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {timeAgo(n.created_at)}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 14, padding: "0 4px", lineHeight: 1, color: "var(--text-muted)" }}
                      onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* ── Activity Logs ──────────────────────────────────────── */
        <>
          {/* Entity type filter */}
          <div className="tab-bar" style={{ marginBottom: 16, gap: 6 }}>
            {entityTypes.map((t) => (
              <button
                key={t}
                className={`tab-btn${logFilter === t ? " active" : ""}`}
                onClick={() => setLogFilter(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="af-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Performed By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {displayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 28, color: "var(--text-muted)" }}>
                      No activity logs.
                    </td>
                  </tr>
                ) : (
                  displayLogs.map((l, i) => (
                    <tr key={l.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                      <td style={{ fontWeight: 500 }}>{l.description}</td>
                      <td>
                        <span className="badge badge-teal" style={{ textTransform: "capitalize" }}>
                          {l.entity_type}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{l.performed_by_name ?? "—"}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: 12.5 }}>{timeAgo(l.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
