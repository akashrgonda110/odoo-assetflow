"use client";

import { useState, useEffect, useCallback } from "react";
import { reports as reportsApi } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/Spinner";
import type { UtilizationDept, MostUsedAsset, IdleAsset, MaintenanceFrequency, DeptAllocationSummary } from "../lib/types";



// ─── Bar chart component ──────────────────────────────────────────
function BarChart({ data }: { data: UtilizationDept[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const colors = ["#fde68a", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fca5a5"];

  return (
    <div className="chart-placeholder" style={{ alignItems: "flex-end", gap: 10, minHeight: 160, padding: "20px 16px 12px" }}>
      {data.map((d, i) => {
        const height = Math.round((d.allocated / max) * 120);
        const totalH = Math.round((d.total / max) * 120);
        return (
          <div key={d.department_name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.department_name}
            </span>
            <div style={{ width: "100%", position: "relative", height: totalH, display: "flex", flexDirection: "column-reverse" }}>
              <div
                className="chart-bar"
                style={{
                  height: height,
                  background: colors[i % colors.length],
                  animation: `fadeUp 0.5s ease ${i * 0.08}s both`,
                  borderRadius: "3px 3px 0 0",
                }}
                title={`${d.department_name}: ${d.allocated}/${d.total} (${d.utilization_pct}%)`}
              />
            </div>
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>{d.utilization_pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Line chart placeholder ────────────────────────────────────────
function LineChart({ data }: { data: MaintenanceFrequency[] }) {
  const max = Math.max(...data.map((d) => d.request_count), 1);
  const w   = 280;
  const h   = 100;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * (w - 20) + 10;
    const y = h - 10 - ((d.request_count / max) * (h - 20));
    return `${x},${y}`;
  });

  return (
    <div className="chart-placeholder" style={{ background: "var(--info-light)", minHeight: 130, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={w} height={h} style={{ overflow: "visible" }}>
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#e9594a"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * (w - 20) + 10;
          const y = h - 10 - ((d.request_count / max) * (h - 20));
          return (
            <circle key={i} cx={x} cy={y} r={4} fill="#e9594a">
              <title>{d.asset_name}: {d.request_count} requests</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

export function ReportsScreen() {
  const { toast } = useToast();

  const [utilization,  setUtil]      = useState<UtilizationDept[]>([]);
  const [mostUsed,     setMostUsed]  = useState<MostUsedAsset[]>([]);
  const [idle,         setIdle]      = useState<IdleAsset[]>([]);
  const [maintFreq,    setMaintFreq] = useState<MaintenanceFrequency[]>([]);
  const [deptAlloc,    setDeptAlloc] = useState<DeptAllocationSummary[]>([]);
  const [loading,      setLoading]   = useState(true);
  const [apiError,     setApiError]  = useState(false);
  const [exporting,    setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [uRes, mRes, iRes, fRes, dRes] = await Promise.all([
        reportsApi.utilization(),
        reportsApi.mostUsed(),
        reportsApi.idle(30),
        reportsApi.maintenanceFrequency(),
        reportsApi.deptAllocation(),
      ]);
      setUtil(uRes.data);
      setMostUsed(mRes.data);
      setIdle(iRes.data);
      setMaintFreq(fRes.data);
      setDeptAlloc(dRes.data);
    } catch (err) {
      console.error("Reports load error:", err);
      setApiError(true);
      toast("Failed to load reports data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await reportsApi.export();
      // If backend returns a download URL, open it
      if (res.data?.url) {
        window.open(res.data.url, "_blank");
      }
      toast("Report export started");
    } catch {
      // Fallback: generate a simple CSV from utilization data
      const rows = [
        ["Department", "Total Assets", "Allocated", "Utilization %"],
        ...utilization.map((d) => [d.department_name, d.total, d.allocated, d.utilization_pct]),
      ];
      const csv  = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `assetflow-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Report downloaded as CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Reports &amp; Analytics</h1>
        <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <span className="spinner" /> : "Export Report"}
        </button>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong>{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>Retry</button>
        </div>
      ) : (
        <>
          {/* Row 1: Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div className="card animate-fade-up stagger-1">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Utilization by Department
              </h3>
              <BarChart data={utilization} />
            </div>

            <div className="card animate-fade-up stagger-2">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Maintenance Frequency
              </h3>
              <LineChart data={maintFreq} />
              <div style={{ marginTop: 10 }}>
                {maintFreq.map((m) => (
                  <div key={m.asset_tag} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", borderBottom: "1px solid var(--border)" }}>
                    <span>{m.asset_tag} — {m.asset_name}</span>
                    <span style={{ fontWeight: 600, color: "var(--danger)" }}>{m.request_count}×</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Text sections */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div className="card animate-fade-up stagger-3">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Most Used Assets (this month)
              </h3>
              {mostUsed.map((a, i) => (
                <div key={a.asset_tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < mostUsed.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12, marginRight: 8 }}>{a.asset_tag}</span>
                    <span style={{ fontSize: 13 }}>{a.asset_name}</span>
                  </div>
                  <span className="badge badge-blue">{a.usage_count} uses</span>
                </div>
              ))}
            </div>

            <div className="card animate-fade-up stagger-4">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Idle Assets (30+ days)
              </h3>
              {idle.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No idle assets — great utilization!</p>
              ) : idle.map((a, i) => (
                <div key={a.asset_tag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < idle.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12, marginRight: 8 }}>{a.asset_tag}</span>
                    <span style={{ fontSize: 13 }}>{a.asset_name}</span>
                    {a.location && <span style={{ fontSize: 11.5, color: "var(--text-muted)", marginLeft: 6 }}>{a.location}</span>}
                  </div>
                  <span className="badge badge-gray">{a.idle_days}d idle</span>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Department allocation + Due attention */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div className="card animate-fade-up stagger-5">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Department-wise Allocation
              </h3>
              <table className="af-table" style={{ fontSize: 12.5 }}>
                <thead>
                  <tr><th>Department</th><th>Assets</th><th>Employees</th><th>Ratio</th></tr>
                </thead>
                <tbody>
                  {deptAlloc.map((d) => (
                    <tr key={d.department_name}>
                      <td>{d.department_name}</td>
                      <td>{d.allocated_count}</td>
                      <td>{d.employee_count}</td>
                      <td style={{ fontWeight: 600 }}>
                        {d.employee_count > 0
                          ? (d.allocated_count / d.employee_count).toFixed(1)
                          : "—"}
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}> /emp</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card animate-fade-up stagger-6">
              <h3 style={{ margin: "0 0 12px", fontSize: 13.5, fontWeight: 600 }}>
                Assets Due for Attention
              </h3>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="badge badge-orange">Maintenance</span>
                  <span>Forklift AF-0087 — service due in 5 days</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="badge badge-gray">Retirement</span>
                  <span>Laptop AF-0020 — 4 years old, nearing retirement</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span className="badge badge-red">Overdue</span>
                  <span>Monitor AF-0021 — return overdue by 3 days</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
