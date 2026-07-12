"use client";

import { useState, useEffect, useCallback } from "react";
import { maintenance as maintApi, assets as assetsApi, employees } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Select, Textarea } from "../components/ui/FormField";
import { PriorityBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import type { MaintenanceRequest, Asset, Employee, MaintenanceStatus, Priority } from "../lib/types";
import { validateMaintenance, hasErrors } from "../lib/validation";

const KANBAN_COLS: { key: MaintenanceStatus; label: string }[] = [
  { key: "pending",             label: "Pending"             },
  { key: "approved",            label: "Approved"            },
  { key: "technician_assigned", label: "Tech Assigned"       },
  { key: "in_progress",         label: "In Progress"         },
  { key: "resolved",            label: "Resolved"            },
];

const NEXT_STATUS: Partial<Record<MaintenanceStatus, MaintenanceStatus>> = {
  pending:             "approved",
  approved:            "technician_assigned",
  technician_assigned: "in_progress",
  in_progress:         "resolved",
};

export function MaintenanceScreen() {
  const { toast } = useToast();

  const [requests,  setRequests]  = useState<MaintenanceRequest[]>([]);
  const [assetList, setAssets]    = useState<Asset[]>([]);
  const [empList,   setEmps]      = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [apiError,  setApiError]  = useState(false);

  // Raise request modal
  const [showRaise,  setShowRaise] = useState(false);
  const [raiseForm,  setRaiseForm] = useState({ asset_id: "", issue_desc: "", priority: "medium" as Priority });
  const [raiseErrors, setRaiseErrors] = useState<Partial<Record<keyof typeof raiseForm, string>>>({});
  const [submitting,  setSubmitting] = useState(false);

  // Reject/resolve modal
  const [rejectTarget,  setRejectTarget]  = useState<MaintenanceRequest | null>(null);
  const [resolveTarget, setResolveTarget] = useState<MaintenanceRequest | null>(null);
  const [noteText,      setNoteText]      = useState("");
  const [noteError,     setNoteError]     = useState("");

  // View filter
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | "all">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [rRes, aRes, eRes] = await Promise.all([
        maintApi.list(),
        assetsApi.list(),
        employees.list(),
      ]);
      setRequests(Array.isArray(rRes.data) ? rRes.data : []);
      const assetData = Array.isArray(aRes.data)
        ? aRes.data
        : (aRes.data as unknown as { assets: Asset[] })?.assets ?? [];
      setAssets(assetData);
      setEmps(eRes.data?.users ?? []);
      if (assetData.length > 0) setRaiseForm((f) => ({ ...f, asset_id: assetData[0].id }));
    } catch (err) {
      console.error("Maintenance load error:", err);
      setApiError(true);
      toast("Failed to load maintenance data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Advance status (Kanban click) ────────────────────────────────
  async function advanceStatus(req: MaintenanceRequest) {
    const next = NEXT_STATUS[req.status];
    if (!next) return;

    if (req.status === "pending") {
      // "Approve" — directly call approve endpoint
      try {
        await maintApi.approve(req.id);
        toast(`${req.asset_tag} approved`);
        loadData();
      } catch (err) {
        console.error("Approve error:", err);
        toast("Failed to approve request", "error");
      }
      return;
    }

    if (req.status === "in_progress") {
      setResolveTarget(req);
      setNoteText("");
      setNoteError("");
      return;
    }

    try {
      if (next === "in_progress") await maintApi.start(req.id);
      else if (next === "technician_assigned") await maintApi.assign(req.id, empList[0]?.id ?? "");
      toast(`${req.asset_tag} moved to ${next.replace("_", " ")}`);
      loadData();
    } catch (err) {
      console.error("Advance error:", err);
      toast("Failed to advance status", "error");
    }
  }

  async function handleReject(req: MaintenanceRequest) {
    setRejectTarget(req);
    setNoteText("");
    setNoteError("");
  }

  async function submitReject() {
    if (!rejectTarget) return;
    if (!noteText.trim()) { setNoteError("Provide a rejection note."); return; }
    try {
      await maintApi.reject(rejectTarget.id, noteText);
      toast("Request rejected");
      loadData();
    } catch (err) {
      console.error("Reject error:", err);
      toast("Failed to reject request", "error");
    }
    setRejectTarget(null);
  }

  async function submitResolve() {
    if (!resolveTarget) return;
    if (!noteText.trim()) { setNoteError("Provide a resolution note."); return; }
    try {
      await maintApi.resolve(resolveTarget.id, noteText);
      toast("Resolved — asset returned to Available");
      loadData();
    } catch (err) {
      console.error("Resolve error:", err);
      toast("Failed to resolve request", "error");
    }
    setResolveTarget(null);
  }

  // ─── Raise request ─────────────────────────────────────────────────
  async function submitRaise() {
    const errors = validateMaintenance(raiseForm);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRaiseErrors(errors as any);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      await maintApi.create({ asset_id: raiseForm.asset_id, issue_desc: raiseForm.issue_desc, priority: raiseForm.priority });
      toast("Maintenance request submitted");
      setShowRaise(false);
      loadData();
    } catch (err) {
      console.error("Raise error:", err);
      toast("Failed to submit request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const displayRequests =
    statusFilter === "all" ? requests : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="animate-fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Maintenance Management</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowRaise(true)}>
          + Raise Request
        </button>
      </div>

      {/* View & filter controls */}
      <div className="tab-bar" style={{ marginBottom: 20, marginTop: 16, gap: 6 }}>
        <button className={`tab-btn${view === "kanban" ? " active" : ""}`} onClick={() => setView("kanban")}>Kanban</button>
        <button className={`tab-btn${view === "list"   ? " active" : ""}`} onClick={() => setView("list")}>List</button>
        {view === "list" && (
          <>
            <span style={{ width: 1, background: "var(--border)", margin: "0 4px", alignSelf: "stretch" }} />
            <button className={`tab-btn${statusFilter === "all" ? " active" : ""}`} onClick={() => setStatusFilter("all")}>All</button>
            {KANBAN_COLS.map((c) => (
              <button key={c.key} className={`tab-btn${statusFilter === c.key ? " active" : ""}`} onClick={() => setStatusFilter(c.key)}>{c.label}</button>
            ))}
          </>
        )}
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong>{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>Retry</button>
        </div>
      ) : view === "kanban" ? (
        <>
          <div className="kanban-board">
            {KANBAN_COLS.map((col) => {
              const colCards = requests.filter((r) => r.status === col.key);
              return (
                <div key={col.key} className="kanban-col">
                  <div className="kanban-col-title">
                    {col.label}
                    {colCards.length > 0 && (
                      <span style={{ marginLeft: 6, background: "var(--accent)", color: "#fff", borderRadius: "99px", fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>
                        {colCards.length}
                      </span>
                    )}
                  </div>
                  {colCards.map((req) => (
                    <div
                      key={req.id}
                      className={`kanban-card${req.status === "resolved" ? " resolved" : ""}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, fontFamily: "monospace" }}>{req.asset_tag}</span>
                        <PriorityBadge priority={req.priority} />
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 6, color: "var(--text-primary)" }}>{req.issue_desc}</div>
                      {req.assigned_to_name && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>tech: {req.assigned_to_name}</div>
                      )}
                      {req.resolved_at && (
                        <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>
                          resolved {new Date(req.resolved_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                        </div>
                      )}
                      {NEXT_STATUS[req.status] && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            onClick={() => advanceStatus(req)}
                          >
                            {req.status === "pending" ? "Approve" : req.status === "in_progress" ? "Resolve" : "Advance →"}
                          </button>
                          {req.status === "pending" && (
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: "3px 8px", color: "var(--danger)", borderColor: "var(--danger)" }}
                              onClick={() => handleReject(req)}
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {colCards.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", paddingTop: 16 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)" }}>
            Approving moves asset to Under Maintenance. Resolving returns it to Available.
          </p>
        </>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="af-table">
            <thead>
              <tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Status</th><th>Raised By</th><th></th></tr>
            </thead>
            <tbody>
              {displayRequests.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No requests found.</td></tr>
              ) : displayRequests.map((r, i) => (
                <tr key={r.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                  <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5 }}>{r.asset_tag}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.issue_desc}</td>
                  <td><PriorityBadge priority={r.priority} /></td>
                  <td>
                    <span className={`badge badge-${r.status === "resolved" ? "green" : r.status === "rejected" ? "red" : r.status === "pending" ? "yellow" : "blue"}`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{r.raised_by_name ?? "—"}</td>
                  <td>
                    {NEXT_STATUS[r.status] && (
                      <button className="btn btn-ghost btn-sm" onClick={() => advanceStatus(r)}>
                        {r.status === "pending" ? "Approve" : r.status === "in_progress" ? "Resolve" : "→"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Raise Request Modal ──────────────────────────────────── */}
      {showRaise && (
        <Modal title="Raise Maintenance Request" onClose={() => setShowRaise(false)}>
          <FormField label="Asset" error={raiseErrors.asset_id} required>
            <Select
              value={raiseForm.asset_id}
              error={raiseErrors.asset_id}
              options={assetList.map((a) => ({ value: a.id, label: `${a.tag} — ${a.name}` }))}
              placeholder="Select asset…"
              onChange={(e) => setRaiseForm({ ...raiseForm, asset_id: e.target.value })}
            />
          </FormField>
          <FormField label="Issue Description" error={raiseErrors.issue_desc} required hint="Min 10 characters.">
            <Textarea
              value={raiseForm.issue_desc}
              error={raiseErrors.issue_desc}
              placeholder="Describe the problem clearly…"
              onChange={(e) => setRaiseForm({ ...raiseForm, issue_desc: e.target.value })}
            />
          </FormField>
          <FormField label="Priority" error={raiseErrors.priority} required>
            <Select
              value={raiseForm.priority}
              options={[
                { value: "low",      label: "Low"      },
                { value: "medium",   label: "Medium"   },
                { value: "high",     label: "High"     },
                { value: "critical", label: "Critical" },
              ]}
              onChange={(e) => setRaiseForm({ ...raiseForm, priority: e.target.value as Priority })}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setShowRaise(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitRaise} disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Submit Request"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Reject Modal ──────────────────────────────────────────── */}
      {rejectTarget && (
        <Modal title="Reject Maintenance Request" onClose={() => setRejectTarget(null)}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Rejecting request for <strong>{rejectTarget.asset_tag}</strong>
          </p>
          <FormField label="Rejection Note" error={noteError} required>
            <Textarea
              value={noteText}
              error={noteError}
              placeholder="Reason for rejection…"
              onChange={(e) => setNoteText(e.target.value)}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={() => setRejectTarget(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={submitReject}>Reject</button>
          </div>
        </Modal>
      )}

      {/* ── Resolve Modal ─────────────────────────────────────────── */}
      {resolveTarget && (
        <Modal title="Resolve Maintenance Request" onClose={() => setResolveTarget(null)}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Resolving <strong>{resolveTarget.asset_tag}</strong> — asset will return to Available.
          </p>
          <FormField label="Resolution Note" error={noteError} required>
            <Textarea
              value={noteText}
              error={noteError}
              placeholder="Describe what was fixed…"
              onChange={(e) => setNoteText(e.target.value)}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-outline" onClick={() => setResolveTarget(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitResolve}>Mark Resolved</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
