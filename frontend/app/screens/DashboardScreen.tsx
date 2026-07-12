"use client";

import { useState, useEffect } from "react";
import { dashboard } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/Spinner";
import type { DashboardKPIs, ActivityItem, Allocation } from "../lib/types";
import type { NavScreen } from "../components/AppShell";

interface KpiCardProps {
  label: string;
  value: number | string;
  bg: string;
  stagger: number;
}
function KpiCard({ label, value, bg, stagger }: KpiCardProps) {
  return (
    <div
      className={`kpi-card animate-fade-up stagger-${stagger}`}
      style={{ background: bg }}
    >
      <div className="kpi-label">{label}</div>
      <div className="kpi-value animate-count-up">{value}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface DashboardScreenProps {
  onNav: (s: NavScreen) => void;
}

// Fallback KPIs for when backend is unreachable
const FALLBACK_KPIS: DashboardKPIs = {
  total_assets: 142,
  available: 128,
  allocated: 76,
  under_maintenance: 4,
  active_bookings: 9,
  pending_transfers: 3,
  upcoming_returns: 12,
  overdue_allocations: 3,
};

const FALLBACK_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    description: "Laptop AF-0114 allocated to Priya Shah · IT dept",
    entity_type: "allocation",
    entity_id: "1",
    performed_by_name: "Rohan Mehta",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "2",
    description: "Room B2 booking confirmed · 2:00 to 3:00 PM",
    entity_type: "booking",
    entity_id: "2",
    performed_by_name: "Priya Shah",
    created_at: new Date(Date.now() - 65 * 60000).toISOString(),
  },
  {
    id: "3",
    description: "Projector AF-0062 maintenance resolved",
    entity_type: "maintenance",
    entity_id: "3",
    performed_by_name: "R. Varma",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "4",
    description: "Transfer AF-0033 approved → Facilities dept",
    entity_type: "transfer",
    entity_id: "4",
    performed_by_name: "Aditi Rao",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

export function DashboardScreen({ onNav }: DashboardScreenProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [kpis, setKpis]         = useState<DashboardKPIs | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [overdue, setOverdue]   = useState<Allocation[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
      } catch {
        if (cancelled) return;
        // Use fallback data when backend is offline
        setKpis(FALLBACK_KPIS);
        setActivity(FALLBACK_ACTIVITY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const k = kpis ?? FALLBACK_KPIS;

  const kpiCards = [
    { label: "Assets Available",   value: k.available,          bg: "#dcfce7" },
    { label: "Assets Allocated",   value: k.allocated,          bg: "var(--accent-light)" },
    { label: "Under Maintenance",  value: k.under_maintenance,  bg: "#fef9c3" },
    { label: "Active Bookings",    value: k.active_bookings,    bg: "#dbeafe" },
    { label: "Pending Transfers",  value: k.pending_transfers,  bg: "#ffedd5" },
    { label: "Upcoming Returns",   value: k.upcoming_returns,   bg: "#f3f4f6" },
  ];

  const entityDotColor: Record<string, string> = {
    allocation:  "var(--accent)",
    booking:     "var(--info)",
    maintenance: "var(--warning)",
    transfer:    "#a78bfa",
    audit:       "#f472b6",
  };

  return (
    <div className="animate-fade-up">
      <h1 className="page-title">
        Today&apos;s Overview
        {user && (
          <span
            style={{ fontSize: 14, fontWeight: 400, color: "var(--text-secondary)", marginLeft: 12 }}
          >
            · {user.name}
          </span>
        )}
      </h1>

      {loading ? (
        <Spinner fullPage />
      ) : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {kpiCards.map((c, i) => (
              <KpiCard
                key={c.label}
                label={c.label}
                value={c.value}
                bg={c.bg}
                stagger={i + 1}
              />
            ))}
          </div>

          {/* Overdue banner */}
          {(overdue.length > 0 || k.overdue_allocations > 0) && (
            <div
              className="alert alert-danger animate-fade-down"
              style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>
                <strong>
                  {overdue.length || k.overdue_allocations} asset
                  {(overdue.length || k.overdue_allocations) > 1 ? "s" : ""}
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

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => onNav("assets")}>
              + Register Asset
            </button>
            <button className="btn btn-outline" onClick={() => onNav("booking")}>
              Book Resource
            </button>
            <button className="btn btn-outline" onClick={() => onNav("maintenance")}>
              Raise Request
            </button>
          </div>

          {/* Recent Activity */}
          <h2 className="section-title">Recent Activity</h2>
          <div className="card" style={{ padding: "4px 0" }}>
            {activity.length === 0 ? (
              <p style={{ padding: "20px 20px", color: "var(--text-muted)", margin: 0, fontSize: 13.5 }}>
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
                    style={{
                      background: entityDotColor[item.entity_type] ?? "var(--accent)",
                    }}
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
        </>
      )}
    </div>
  );
}
