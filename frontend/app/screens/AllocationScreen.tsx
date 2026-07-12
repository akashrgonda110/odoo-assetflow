"use client";

import { useState, useEffect, useCallback } from "react";
import { assets as assetsApi, allocations, employees } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select, Textarea } from "../components/ui/FormField";
import { AssetStatusBadge, TransferStatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import type {
  Asset, Allocation, Transfer, Employee,
  AllocationPayload, ReturnPayload, TransferPayload,
} from "../lib/types";
import { validateTransfer, hasErrors, required } from "../lib/validation";

const MOCK_ASSETS: Asset[] = [
  { id:"1", tag:"AF-0114", name:"Dell Laptop",    category_id:"1", condition:"good",  status:"allocated", location:"Bengaluru",  is_bookable:false, assigned_to_name:"Priya Shah",  department_name:"Engineering" },
  { id:"2", tag:"AF-0012", name:"MacBook Pro",    category_id:"1", condition:"new",   status:"allocated", location:"Bengaluru",  is_bookable:false, assigned_to_name:"Rohan Mehta", department_name:"Facilities"  },
  { id:"3", tag:"AF-0201", name:"Office Chair",   category_id:"2", condition:"good",  status:"available", location:"Warehouse",  is_bookable:false },
  { id:"4", tag:"AF-0033", name:"Conference Van", category_id:"3", condition:"good",  status:"available", location:"HQ Parking", is_bookable:true  },
];
const MOCK_EMPS: Employee[] = [
  { id:"1", name:"Aditi Rao",   email:"a@a.com", role:"admin",          is_active:true },
  { id:"2", name:"Rohan Mehta", email:"r@r.com", role:"asset_manager",  is_active:true },
  { id:"3", name:"Priya Shah",  email:"p@p.com", role:"employee",       is_active:true },
  { id:"4", name:"Arjun Nair",  email:"n@n.com", role:"employee",       is_active:true },
];
const MOCK_ALLOCS: Allocation[] = [
  { id:"1", asset_id:"1", asset_tag:"AF-0114", asset_name:"Dell Laptop",  assigned_to_user_name:"Priya Shah",  expected_return_at:"2026-12-31", is_active:true,  created_at:"2026-03-12T10:00:00Z" },
  { id:"2", asset_id:"2", asset_tag:"AF-0012", asset_name:"MacBook Pro",  assigned_to_user_name:"Rohan Mehta", is_active:true, created_at:"2026-01-04T09:00:00Z" },
];
const MOCK_TRANSFERS: Transfer[] = [
  { id:"1", asset_id:"1", asset_tag:"AF-0114", asset_name:"Dell Laptop", from_user_name:"Priya Shah", to_user_id:"4", to_user_name:"Arjun Nair", reason:"Project reassignment", status:"pending", created_at:"2026-07-10T08:00:00Z" },
];

export function AllocationScreen() {
  const { toast } = useToast();

  const [assetList,    setAssets]    = useState<Asset[]>([]);
  const [empList,      setEmps]      = useState<Employee[]>([]);
  const [allocList,    setAllocs]    = useState<Allocation[]>([]);
  const [transferList, setTransfers] = useState<Transfer[]>([]);
  const [loading,      setLoading]   = useState(true);

  const [tab, setTab] = useState<"allocate" | "transfers">("allocate");

  // Allocate form
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [allocMode,       setAllocMode]        = useState<"employee" | "dept">("employee");
  const [toUserId,        setToUserId]         = useState("");
  const [expectedReturn,  setExpReturn]        = useState("");
  const [allocErrors,     setAllocErrors]      = useState<Record<string, string>>({});

  // Transfer form
  const [transferForm,   setTransferForm]   = useState<{ to_user_id: string; reason: string }>({ to_user_id: "", reason: "" });
  const [transferErrors, setTransferErrors] = useState<Partial<typeof transferForm>>({});

  // Return modal
  const [returnAlloc,    setReturnAlloc]  = useState<Allocation | null>(null);
  const [returnForm,     setReturnForm]   = useState<ReturnPayload>({ return_condition: "good" });
  const [returnErrors,   setReturnErrors] = useState<Partial<ReturnPayload>>({});

  const selectedAsset = assetList.find((a) => a.id === selectedAssetId);
  const isAllocated   = selectedAsset?.status === "allocated";
  const currentAlloc  = allocList.find((al) => al.asset_id === selectedAssetId && al.is_active);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes, alRes, trRes] = await Promise.all([
        assetsApi.list(),
        employees.list(),
        allocations.list(),
        allocations.listTransfers(),
      ]);
      setAssets(aRes.data);
      setEmps(eRes.data);
      setAllocs(alRes.data);
      setTransfers(trRes.data);
      if (aRes.data.length > 0) setSelectedAssetId(aRes.data[0].id);
    } catch {
      setAssets(MOCK_ASSETS);
      setEmps(MOCK_EMPS);
      setAllocs(MOCK_ALLOCS);
      setTransfers(MOCK_TRANSFERS);
      setSelectedAssetId(MOCK_ASSETS[0].id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    // Reset form fields when asset changes
    setToUserId("");
    setAllocErrors({});
    setTransferForm({ to_user_id: "", reason: "" });
    setTransferErrors({});
  }, [selectedAssetId]);

  // ─── Allocate ────────────────────────────────────────────────────
  async function handleAllocate() {
    const e: Record<string, string> = {};
    e.to = required(toUserId, "Recipient") ?? "";
    setAllocErrors(e);
    if (e.to) return;

    const payload: AllocationPayload = {
      asset_id:        selectedAssetId,
      assigned_to_user: allocMode === "employee" ? toUserId : undefined,
      expected_return_at: expectedReturn || undefined,
    };
    try {
      await allocations.create(payload);
      toast(`Asset allocated to ${empList.find((e) => e.id === toUserId)?.name}`);
      loadData();
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "") ?? "";
      if (msg.includes("409") || msg.toLowerCase().includes("conflict")) {
        toast("Asset is already allocated — use Transfer instead", "error");
      } else {
        // Optimistic for demo
        setAssets((prev) => prev.map((a) => a.id === selectedAssetId
          ? { ...a, status: "allocated", assigned_to_name: empList.find((e) => e.id === toUserId)?.name }
          : a));
        toast("Allocated (offline demo)");
      }
    }
  }

  // ─── Transfer request ─────────────────────────────────────────────
  async function handleTransfer() {
    const errors = validateTransfer(transferForm);
    setTransferErrors(errors);
    if (hasErrors(errors)) return;

    const payload: TransferPayload = {
      asset_id:   selectedAssetId,
      to_user_id: transferForm.to_user_id,
      reason:     transferForm.reason,
    };
    try {
      await allocations.requestTransfer(payload);
      toast("Transfer request submitted");
      loadData();
    } catch {
      const newT: Transfer = {
        id:          String(Date.now()),
        asset_id:    selectedAssetId,
        asset_tag:   selectedAsset?.tag,
        asset_name:  selectedAsset?.name,
        from_user_name: currentAlloc?.assigned_to_user_name,
        to_user_id:  transferForm.to_user_id,
        to_user_name: empList.find((e) => e.id === transferForm.to_user_id)?.name,
        reason:      transferForm.reason,
        status:      "pending",
        created_at:  new Date().toISOString(),
      };
      setTransfers((prev) => [newT, ...prev]);
      toast("Transfer request submitted (offline)");
    }
    setTransferForm({ to_user_id: "", reason: "" });
  }

  // ─── Return ────────────────────────────────────────────────────────
  async function handleReturn() {
    if (!returnAlloc) return;
    const e: Record<string, string | undefined> = {};
    e.return_condition = required(returnForm.return_condition, "Condition");
    setReturnErrors(e as Partial<ReturnPayload>);
    if (Object.values(e).some(Boolean)) return;

    try {
      await allocations.return(returnAlloc.id, returnForm);
      toast("Asset returned successfully");
      loadData();
    } catch {
      setAllocs((prev) => prev.map((a) => a.id === returnAlloc.id ? { ...a, is_active: false } : a));
      setAssets((prev) => prev.map((a) => a.id === returnAlloc.asset_id ? { ...a, status: "available", assigned_to_name: undefined } : a));
      toast("Return recorded (offline)");
    }
    setReturnAlloc(null);
  }

  // ─── Transfer approve/reject ───────────────────────────────────────
  async function approveTransfer(id: string) {
    try {
      await allocations.approveTransfer(id);
      toast("Transfer approved");
      loadData();
    } catch {
      setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, status: "approved" } : t));
      toast("Transfer approved (offline)");
    }
  }
  async function rejectTransfer(id: string) {
    const note = prompt("Rejection note:");
    if (!note) return;
    try {
      await allocations.rejectTransfer(id, note);
      toast("Transfer rejected");
      loadData();
    } catch {
      setTransfers((prev) => prev.map((t) => t.id === id ? { ...t, status: "rejected", rejection_note: note } : t));
      toast("Transfer rejected (offline)");
    }
  }

  const history = [
    { date: "Mar 12", action: `Allocated to ${currentAlloc?.assigned_to_user_name ?? "—"} – ${selectedAsset?.department_name ?? "N/A"}` },
    { date: "Jan 04", action: "Returned by Arjun Nair – condition: good" },
  ];

  return (
    <div className="animate-fade-up">
      <h1 className="page-title">Allocation &amp; Transfer</h1>

      {/* Sub-tabs */}
      <div className="tab-bar" style={{ marginBottom: 24 }}>
        <button className={`tab-btn${tab === "allocate" ? " active" : ""}`} onClick={() => setTab("allocate")}>
          Allocate / Return
        </button>
        <button className={`tab-btn${tab === "transfers" ? " active" : ""}`} onClick={() => setTab("transfers")}>
          Transfer Requests
          {transferList.filter((t) => t.status === "pending").length > 0 && (
            <span style={{ marginLeft: 6, background: "var(--warning)", color: "#fff", borderRadius: "99px", fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
              {transferList.filter((t) => t.status === "pending").length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : tab === "allocate" ? (
        <>
          {/* Asset selector */}
          <div style={{ marginBottom: 16, maxWidth: 480 }}>
            <FormField label="Asset">
              <Select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                options={assetList.map((a) => ({ value: a.id, label: `${a.tag} – ${a.name}` }))}
              />
            </FormField>
          </div>

          {/* Status banner */}
          {selectedAsset && (
            <div className={`alert ${isAllocated ? "alert-danger" : "alert-success"} animate-fade-down`} style={{ marginBottom: 20 }}>
              {isAllocated ? (
                <>
                  Already allocated to <strong>{currentAlloc?.assigned_to_user_name ?? selectedAsset.assigned_to_name}</strong>
                  {selectedAsset.department_name ? ` (${selectedAsset.department_name})` : ""}
                  .<br />
                  Direct re-allocation is blocked — submit a transfer request below.
                </>
              ) : (
                <>
                  <AssetStatusBadge status={selectedAsset.status} />{" "}
                  <strong>{selectedAsset.tag}</strong> is available — you can allocate it directly.
                </>
              )}
            </div>
          )}

          {/* Allocation / Transfer form */}
          <div className="card animate-fade-up" style={{ marginBottom: 24, maxWidth: 520 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>
              {isAllocated ? "Submit Transfer Request" : "Allocate Asset"}
            </h3>

            {!isAllocated && (
              <div className="tab-bar" style={{ marginBottom: 14 }}>
                <button className={`tab-btn${allocMode === "employee" ? " active" : ""}`} onClick={() => setAllocMode("employee")}>To Employee</button>
                <button className={`tab-btn${allocMode === "dept"     ? " active" : ""}`} onClick={() => setAllocMode("dept")}>To Department</button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isAllocated ? "1fr 1fr" : "1fr", gap: 12 }}>
              {isAllocated && (
                <FormField label="From">
                  <Input value={currentAlloc?.assigned_to_user_name ?? selectedAsset?.assigned_to_name ?? ""} readOnly />
                </FormField>
              )}
              <FormField label="To" error={allocErrors.to || transferErrors.to_user_id} required>
                <Select
                  value={isAllocated ? transferForm.to_user_id : toUserId}
                  error={allocErrors.to || transferErrors.to_user_id}
                  placeholder="Select Employee…"
                  options={empList.map((e) => ({ value: e.id, label: e.name }))}
                  onChange={(e) =>
                    isAllocated
                      ? setTransferForm({ ...transferForm, to_user_id: e.target.value })
                      : setToUserId(e.target.value)
                  }
                />
              </FormField>
            </div>

            {!isAllocated && (
              <FormField label="Expected Return Date">
                <Input
                  type="date"
                  value={expectedReturn}
                  onChange={(e) => setExpReturn(e.target.value)}
                />
              </FormField>
            )}

            {isAllocated && (
              <FormField label="Reason" error={transferErrors.reason} required>
                <Textarea
                  value={transferForm.reason}
                  error={transferErrors.reason}
                  placeholder="Why is this transfer needed? (min 10 chars)"
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                />
              </FormField>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-primary"
                onClick={isAllocated ? handleTransfer : handleAllocate}
              >
                {isAllocated ? "Submit Request" : "Allocate Asset"}
              </button>

              {isAllocated && currentAlloc && (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setReturnAlloc(currentAlloc);
                    setReturnForm({ return_condition: "good" });
                  }}
                >
                  Return Asset
                </button>
              )}
            </div>
          </div>

          {/* Allocation history */}
          <h2 className="section-title" style={{ fontSize: 15 }}>Allocation History</h2>
          <hr className="divider" style={{ margin: "0 0 12px" }} />
          {history.map((h, i) => (
            <div key={i} className={`activity-item animate-fade-up stagger-${i + 1}`}>
              <div className="activity-dot" style={{ background: "var(--info)" }} />
              <span style={{ fontSize: 13 }}>
                <strong>{h.date}</strong> &mdash; {h.action}
              </span>
            </div>
          ))}

          {/* Active allocations table */}
          {allocList.filter((a) => a.is_active).length > 0 && (
            <>
              <h2 className="section-title" style={{ fontSize: 15, marginTop: 28 }}>Active Allocations</h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="af-table">
                  <thead>
                    <tr><th>Asset</th><th>Assigned To</th><th>Expected Return</th><th>Overdue</th><th></th></tr>
                  </thead>
                  <tbody>
                    {allocList.filter((a) => a.is_active).map((a, i) => (
                      <tr key={a.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                        <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12.5 }}>{a.asset_tag}</td>
                        <td>{a.assigned_to_user_name ?? a.assigned_to_dept_name ?? "—"}</td>
                        <td style={{ color: "var(--text-secondary)" }}>
                          {a.expected_return_at ? new Date(a.expected_return_at).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          {a.is_overdue && <span className="badge badge-red">Overdue</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm"
                            onClick={() => { setReturnAlloc(a); setReturnForm({ return_condition: "good" }); }}>
                            Return
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        /* ── Transfers Tab ──────────────────────────────────────── */
        <>
          {transferList.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)" }}>
              No transfer requests yet.
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="af-table">
                <thead>
                  <tr><th>Asset</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {transferList.map((t, i) => (
                    <tr key={t.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                      <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12.5 }}>{t.asset_tag}</td>
                      <td>{t.from_user_name ?? "—"}</td>
                      <td>{t.to_user_name ?? t.to_user_id}</td>
                      <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)" }}>
                        {t.reason}
                      </td>
                      <td><TransferStatusBadge status={t.status} /></td>
                      <td>
                        {t.status === "pending" && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-sm btn-primary" onClick={() => approveTransfer(t.id)}>Approve</button>
                            <button className="btn btn-sm btn-outline" style={{ color: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => rejectTransfer(t.id)}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Return Modal ──────────────────────────────────────────── */}
      {returnAlloc && (
        <Modal title="Return Asset" onClose={() => setReturnAlloc(null)}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Returning <strong>{returnAlloc.asset_tag ?? returnAlloc.asset_name}</strong>
          </p>
          <FormField label="Return Condition" error={returnErrors.return_condition} required>
            <Select
              value={returnForm.return_condition}
              error={returnErrors.return_condition}
              options={[
                { value: "new",     label: "New"     },
                { value: "good",    label: "Good"    },
                { value: "fair",    label: "Fair"    },
                { value: "poor",    label: "Poor"    },
                { value: "damaged", label: "Damaged" },
              ]}
              onChange={(e) => setReturnForm({ ...returnForm, return_condition: e.target.value as ReturnPayload["return_condition"] })}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={returnForm.return_notes ?? ""}
              placeholder="Any notes on asset condition…"
              onChange={(e) => setReturnForm({ ...returnForm, return_notes: e.target.value })}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setReturnAlloc(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleReturn}>Confirm Return</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
