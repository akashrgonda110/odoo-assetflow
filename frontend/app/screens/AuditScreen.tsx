"use client";

import { useState, useEffect, useCallback } from "react";
import { audits as auditsApi, assets as assetsApi, employees } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select, Textarea } from "../components/ui/FormField";
import { VerifyBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import type { AuditCycle, AuditItem, Asset, Employee, VerificationStatus } from "../lib/types";
import { validateAudit, hasErrors } from "../lib/validation";



export function AuditScreen() {
  const { toast } = useToast();

  const [cycles,    setCycles]    = useState<AuditCycle[]>([]);
  const [assetList, setAssets]    = useState<Asset[]>([]);
  const [empList,   setEmps]      = useState<Employee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [apiError,  setApiError]  = useState(false);

  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);

  // Create cycle modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", start_date: "", end_date: "", notes: "" });
  const [createErrors, setCreateErrors] = useState<Partial<typeof createForm>>({});
  const [submitting, setSubmitting] = useState(false);

  // Add asset to audit
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [addAssetId,   setAddAssetId]   = useState("");
  const [addAssetLoc,  setAddAssetLoc]  = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [cRes, aRes, eRes] = await Promise.all([
        auditsApi.list(),
        assetsApi.list(),
        employees.list(),
      ]);
      setCycles(cRes.data);
      setAssets(aRes.data);
      setEmps(eRes.data);
      if (cRes.data.length > 0) setActiveCycle(cRes.data[0]);
    } catch (err) {
      console.error("Audit load error:", err);
      setApiError(true);
      toast("Failed to load audit data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Verify item ─────────────────────────────────────────────────
  async function verifyItem(item: AuditItem, v: VerificationStatus) {
    if (!activeCycle) return;
    try {
      await auditsApi.verifyItem(activeCycle.id, item.id, v);
      toast(`${item.asset_tag} marked as ${v}`);
      loadData();
    } catch (err) {
      console.error("Verify error:", err);
      toast("Failed to verify item", "error");
    }
  }

  // ─── Close audit cycle ───────────────────────────────────────────
  async function closeCycle() {
    if (!activeCycle) return;
    if (!confirm("Close this audit cycle? This will update all affected asset statuses.")) return;
    try {
      await auditsApi.close(activeCycle.id);
      toast("Audit cycle closed — discrepancy report archived");
      loadData();
    } catch (err) {
      console.error("Close audit error:", err);
      toast("Failed to close audit cycle", "error");
    }
  }

  // ─── Create cycle ────────────────────────────────────────────────
  async function submitCreate() {
    const errors = validateAudit(createForm);
    setCreateErrors(errors);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    try {
      const res = await auditsApi.create({
        title:      createForm.title,
        start_date: createForm.start_date,
        end_date:   createForm.end_date,
        notes:      createForm.notes || undefined,
      });
      toast("Audit cycle created");
      setShowCreate(false);
      loadData();
      setActiveCycle(res.data);
    } catch (err) {
      console.error("Create audit error:", err);
      toast("Failed to create audit cycle", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Add asset to cycle ──────────────────────────────────────────
  async function submitAddAsset() {
    if (!activeCycle || !addAssetId) { toast("Select an asset", "error"); return; }
    try {
      await auditsApi.addItem(activeCycle.id, addAssetId, addAssetLoc || undefined);
      toast("Asset added to audit");
      loadData();
    } catch (err) {
      console.error("Add item error:", err);
      toast("Failed to add asset to audit", "error");
    }
    setShowAddAsset(false);
    setAddAssetId("");
    setAddAssetLoc("");
  }

  const flagged = activeCycle?.items?.filter((i) => i.verification === "missing" || i.verification === "damaged").length ?? 0;

  return (
    <div className="animate-fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Asset Audit</h1>
        <button className="btn btn-primary btn-sm" onClick={() => {
          setCreateForm({ title: "", start_date: "", end_date: "", notes: "" });
          setCreateErrors({});
          setShowCreate(true);
        }}>
          + New Audit Cycle
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
          {/* Cycle selector (if multiple) */}
          {cycles.length > 1 && (
            <div style={{ marginBottom: 16, maxWidth: 480 }}>
              <FormField label="Audit Cycle">
                <Select
                  value={activeCycle?.id ?? ""}
                  options={cycles.map((c) => ({ value: c.id, label: `${c.title} (${c.status})` }))}
                  onChange={(e) => setActiveCycle(cycles.find((c) => c.id === e.target.value) ?? null)}
                />
              </FormField>
            </div>
          )}

          {activeCycle ? (
            <>
              {/* Cycle info banner */}
              <div
                className="card animate-fade-up"
                style={{ background: "#faf5f0", marginBottom: 20, border: "1px solid #e8d5c0" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{activeCycle.title}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                      {new Date(activeCycle.start_date).toLocaleDateString()} –{" "}
                      {new Date(activeCycle.end_date).toLocaleDateString()}
                    </div>
                    {activeCycle.auditors && activeCycle.auditors.length > 0 && (
                      <div style={{ color: "var(--text-secondary)", fontSize: 12.5, marginTop: 4 }}>
                        Auditors: {activeCycle.auditors.map((a) => a.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <span className={`badge badge-${activeCycle.status === "open" ? "green" : "gray"}`}>
                    {activeCycle.status.charAt(0).toUpperCase() + activeCycle.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Items table */}
              <div className="card animate-fade-up" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                    Audit Items ({activeCycle.items?.length ?? 0})
                  </span>
                  {activeCycle.status === "open" && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddAsset(true); setAddAssetId(assetList[0]?.id ?? ""); }}>
                      + Add Asset
                    </button>
                  )}
                </div>
                <table className="af-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Name</th>
                      <th>Expected Location</th>
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!activeCycle.items || activeCycle.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>
                          No assets in this audit cycle. Add assets above.
                        </td>
                      </tr>
                    ) : (
                      activeCycle.items.map((item, i) => (
                        <tr key={item.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                          <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5 }}>{item.asset_tag}</td>
                          <td style={{ fontWeight: 500 }}>{item.asset_name}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{item.expected_location ?? "—"}</td>
                          <td>
                            {activeCycle.status === "open" ? (
                              <Select
                                value={item.verification}
                                style={{ width: "auto", minWidth: 120 }}
                                options={[
                                  { value: "pending",  label: "Pending"  },
                                  { value: "verified", label: "Verified" },
                                  { value: "missing",  label: "Missing"  },
                                  { value: "damaged",  label: "Damaged"  },
                                ]}
                                onChange={(e) => verifyItem(item, e.target.value as VerificationStatus)}
                              />
                            ) : (
                              <VerifyBadge status={item.verification} />
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <hr className="divider" />

              {/* Discrepancy summary */}
              {flagged > 0 && (
                <div className="alert alert-warning animate-fade-down" style={{ marginBottom: 16 }}>
                  <strong>{flagged} asset{flagged > 1 ? "s" : ""}</strong> flagged —
                  discrepancy report generated automatically.
                </div>
              )}

              {activeCycle.status === "closed" ? (
                <div className="alert alert-success animate-fade-down">
                  Audit cycle closed. Statuses locked. Discrepancy report archived.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-outline" onClick={closeCycle}>
                    Close Audit Cycle
                  </button>
                  <span style={{ fontSize: 12.5, color: "var(--text-muted)", alignSelf: "center" }}>
                    Closing locks all statuses and updates affected asset records.
                  </span>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 48 }}>
              No audit cycles yet.{" "}
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                Create one
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Create Cycle Modal ──────────────────────────────────── */}
      {showCreate && (
        <Modal title="Create Audit Cycle" onClose={() => setShowCreate(false)}>
          <FormField label="Title" error={createErrors.title} required>
            <Input
              value={createForm.title}
              error={createErrors.title}
              placeholder="e.g. Q3 Audit: Engineering Dept"
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Start Date" error={createErrors.start_date} required>
              <Input
                type="date"
                value={createForm.start_date}
                error={createErrors.start_date}
                onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
              />
            </FormField>
            <FormField label="End Date" error={createErrors.end_date} required>
              <Input
                type="date"
                value={createForm.end_date}
                error={createErrors.end_date}
                onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea
              value={createForm.notes}
              placeholder="Scope, objectives, etc."
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitCreate} disabled={submitting}>
              {submitting ? <span className="spinner" /> : "Create Cycle"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Add Asset Modal ─────────────────────────────────────── */}
      {showAddAsset && (
        <Modal title="Add Asset to Audit" onClose={() => setShowAddAsset(false)}>
          <FormField label="Asset" required>
            <Select
              value={addAssetId}
              options={assetList.map((a) => ({ value: a.id, label: `${a.tag} — ${a.name}` }))}
              placeholder="Select asset…"
              onChange={(e) => setAddAssetId(e.target.value)}
            />
          </FormField>
          <FormField label="Expected Location">
            <Input
              value={addAssetLoc}
              placeholder="e.g. Desk E12"
              onChange={(e) => setAddAssetLoc(e.target.value)}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setShowAddAsset(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitAddAsset}>Add Asset</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
