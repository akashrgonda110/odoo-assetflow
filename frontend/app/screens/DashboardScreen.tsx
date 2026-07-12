"use client";

import { useState, useEffect } from "react";
import { dashboard } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/Spinner";
import type { DashboardKPIs, ActivityItem, Allocation } from "../lib/types";
import type { NavScreen } from "../components/AppShell";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface KpiCardProps {
  label: string;
  value: number | string;
  iconBg: string;
  icon: string;
  stagger: number;
}

function KpiCard({ label, value, iconBg, icon, stagger }: KpiCardProps) {
  return (
    <div className={`kpi-card animate-fade-up stagger-${stagger}`}>
      <div className="kpi-icon" style={{ background: iconBg }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

interface DashboardScreenProps {
  onNav: (s: NavScreen) => void;
}

const entityDotColor: Record<string, string> = {
  allocation:  "var(--primary)",
  booking:     "var(--info)",
  maintenance: "var(--warning)",
  transfer:    "#7c3aed",
  audit:       "#db2777",
};

export function DashboardScreen({ onNav }: DashboardScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [kpis, setKpis]         = useState<DashboardKPIs | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [overdue, setOverdue]   = useState<Allocation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(false);
      try {
        const [kpiRes, actRes, overdueRes] = await Promise.all([
          dashboard.kpis(),
          dashboard.recentActivity(8),
          dashboard.overdueAllocations(),
        ]);
        if (cancelled) return;
        setKpis(kpiRes.data);
        setActivity(actRes.data);
        setOverdue(overdueRes.data);
      } catch (err) {
        if (cancelled) return;
        setError(true);
        toast("Could not reach backend — check server connection", "error");
        console.error("Dashboard load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [toast]);

  const k = kpis;

  const kpiCards = k
    ? [
        { label: "Total Assets",       value: k.total_assets,        iconBg: "#ede9fe", icon: "📦", stagger: 1 },
        { label: "Available",          value: k.available,           iconBg: "#dcfce7", icon: "✅", stagger: 2 },
        { label: "Allocated",          value: k.allocated,           iconBg: "#dbeafe", icon: "🔗", stagger: 3 },
        { label: "Under Maintenance",  value: k.under_maintenance,   iconBg: "#fef3c7", icon: "🔧", stagger: 4 },
        { label: "Active Bookings",    value: k.active_bookings,     iconBg: "#e0f2fe", icon: "📅", stagger: 5 },
        { label: "Pending Transfers",  value: k.pending_transfers,   iconBg: "#fce7f3", icon: "🔄", stagger: 6 },
      ]
    : [];

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            Dashboard
          </h1>
          {user && (
            <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: 0 }}>
              Welcome back, <strong>{user.name}</strong> ·{" "}
              <span style={{ textTransform: "capitalize" }}>{user.role.replace(/_/g, " ")}</span>
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => onNav("assets")}>
            + Register Asset
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => onNav("booking")}>
            Book Resource
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => onNav("maintenance")}>
            Raise Request
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : error ? (
        <div className="alert alert-danger animate-fade-up" style={{ marginBottom: 24 }}>
          <strong>Backend unreachable.</strong> Make sure the backend server is running on port 5000 and CORS is configured correctly.
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {kpiCards.map((c) => (
              <KpiCard
                key={c.label}
                label={c.label}
                value={c.value}
                iconBg={c.iconBg}
                icon={c.icon}
                stagger={c.stagger}
              />
            ))}
          </div>

          {/* Overdue banner */}
          {(overdue.length > 0 || (k && k.overdue_allocations > 0)) && (
            <div
              className="alert alert-danger animate-fade-down"
              style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>
                <strong>
                  {overdue.length || k?.overdue_allocations} asset
                  {(overdue.length || k?.overdue_allocations || 0) > 1 ? "s" : ""}
                </strong>{" "}
                overdue for return — flagged for follow-up
              </span>
              <button
                className="btn btn-sm btn-outline"
                style={{ borderColor: "#fca5a5", color: "#991b1b", background: "transparent" }}
                onClick={() => onNav("allocation")}
              >
                View →
              </button>
            </div>
          )}

          {/* Recent Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
            {/* Activity feed */}
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>Recent Activity</h2>
              <div className="card" style={{ padding: "4px 0" }}>
                {activity.length === 0 ? (
                  <p style={{ padding: "24px 20px", color: "var(--text-muted)", margin: 0, fontSize: 13.5, textAlign: "center" }}>
                    No recent activity.
                  </p>
                ) : (
                  activity.map((item, i) => (
                    <div
                      key={item.id}
                      className={`activity-item animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                      style={{ padding: "11px 20px" }}
                    >
                      <div
                        className="activity-dot"
                        style={{ background: entityDotColor[item.entity_type] ?? "var(--primary)" }}
                      />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13.5 }}>{item.description}</span>
                        {item.performed_by_name && (
                          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>
                            by {item.performed_by_name}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overdue allocations detail */}
            <div>
              <h2 className="section-title" style={{ marginTop: 0 }}>Overdue Returns</h2>
              <div className="card" style={{ padding: "4px 0" }}>
                {overdue.length === 0 ? (
                  <p style={{ padding: "24px 20px", color: "var(--text-muted)", margin: 0, fontSize: 13.5, textAlign: "center" }}>
                    No overdue allocations 🎉
                  </p>
                ) : (
                  overdue.slice(0, 6).map((al, i) => (
                    <div
                      key={al.id}
                      className={`activity-item animate-fade-up stagger-${Math.min(i + 1, 6)}`}
                      style={{ padding: "11px 20px" }}
                    >
                      <div className="activity-dot" style={{ background: "var(--danger)" }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
                          {al.asset_tag}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 8 }}>
                          {al.assigned_to_user_name ?? al.assigned_to_dept_name ?? "—"}
                        </span>
                      </div>
                      <span className="badge badge-red" style={{ fontSize: 11 }}>Overdue</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
