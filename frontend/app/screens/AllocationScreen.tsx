"use client";

import { Pagination } from "../components/ui/Pagination";

const PAGE_SIZE = 10;

import { useState, useEffect, useCallback } from "react";
import { assets as assetsApi, allocations, employees, departments as departmentsApi } from "../lib/api";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select, Textarea } from "../components/ui/FormField";
import { AssetStatusBadge, TransferStatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import type {
  Asset, Allocation, Transfer, Employee, Department,
  AllocationPayload, ReturnPayload, TransferPayload,
} from "../lib/types";
import { validateTransfer, hasErrors, required } from "../lib/validation";

export function AllocationScreen() {
  const { toast } = useToast();

  const [assetList,    setAssets]    = useState<Asset[]>([]);
  const [empList,      setEmps]      = useState<Employee[]>([]);
  const [deptList,     setDepts]     = useState<Department[]>([]);
  const [allocList,    setAllocs]    = useState<Allocation[]>([]);
  const [transferList, setTransfers] = useState<Transfer[]>([]);
  const [loading,      setLoading]   = useState(true);

  const [tab, setTab] = useState<"allocate" | "transfers">("allocate");

  // Allocate form
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [allocMode,       setAllocMode]        = useState<"employee" | "dept">("employee");
  const [toUserId,        setToUserId]         = useState("");
  const [toDeptId,        setToDeptId]         = useState("");
  const [expectedReturn,  setExpReturn]        = useState("");
  const [allocErrors,     setAllocErrors]      = useState<Record<string, string>>({});

  // Transfer form
  const [transferForm,   setTransferForm]   = useState<{ to_user_id: string; to_dept_id: string; reason: string }>({ to_user_id: "", to_dept_id: "", reason: "" });
  const [transferErrors, setTransferErrors] = useState<Partial<typeof transferForm>>({});
  const [transferMode,   setTransferMode]   = useState<"employee" | "dept">("employee");

  // Return modal
  const [returnAlloc,    setReturnAlloc]  = useState<Allocation | null>(null);
  const [returnForm,     setReturnForm]   = useState<ReturnPayload>({ return_condition: "good" });
  const [returnErrors,   setReturnErrors] = useState<Partial<ReturnPayload>>({});

  // Pagination for active allocations and transfers tables
  const [allocPage,    setAllocPage]    = useState(1);
  const [transferPage, setTransferPage] = useState(1);

  const selectedAsset = assetList.find((a) => a.id === selectedAssetId);
  const isAllocated   = selectedAsset?.status === "allocated";
  const currentAlloc  = allocList.find((al) => al.asset_id === selectedAssetId && al.is_active);

  const [apiError, setApiError] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [aRes, eRes, dRes, alRes, trRes] = await Promise.all([
        assetsApi.list(),
        employees.list(),
        departmentsApi.list("active"),
        allocations.list(),
        allocations.listTransfers(),
      ]);
      // assets.list() returns a paginated envelope: { assets: [...], total, limit, offset }
      const assetData = Array.isArray(aRes.data)
        ? aRes.data
        : (aRes.data as unknown as { assets: Asset[] })?.assets ?? [];
      setAssets(assetData);
      setEmps(eRes.data?.users ?? []);
      setDepts(Array.isArray(dRes.data) ? dRes.data : []);
      setAllocs(Array.isArray(alRes.data) ? alRes.data : []);
      setTransfers(Array.isArray(trRes.data) ? trRes.data : []);
      if (assetData.length > 0) setSelectedAssetId(assetData[0].id);
    } catch (err) {
      console.error("Allocation load error:", err);
      setApiError(true);
      toast("Failed to load data — check backend connection", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    // Reset form fields when asset changes
    setToUserId("");
    setToDeptId("");
    setAllocErrors({});
    setTransferForm({ to_user_id: "", to_dept_id: "", reason: "" });
    setTransferErrors({});
    setTransferMode("employee");
  }, [selectedAssetId]);

  // ─── Allocate ────────────────────────────────────────────────────
  async function handleAllocate() {
    const e: Record<string, string> = {};
    const recipientId = allocMode === "employee" ? toUserId : toDeptId;
    e.to = required(recipientId, "Recipient") ?? "";
    setAllocErrors(e);
    if (e.to) return;

    const payload: AllocationPayload = {
      asset_id:            selectedAssetId,
      assigned_to_user:    allocMode === "employee" ? toUserId   : undefined,
      assigned_to_dept:    allocMode === "dept"     ? toDeptId   : undefined,
      expected_return_at:  expectedReturn || undefined,
    };
    try {
      await allocations.create(payload);
      const recipientName =
        allocMode === "employee"
          ? empList.find((e) => e.id === toUserId)?.name
          : deptList.find((d) => d.id === toDeptId)?.name;
      toast(`Asset allocated to ${recipientName}`);
      loadData();
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "") ?? "";
      if (msg.includes("409") || msg.toLowerCase().includes("conflict")) {
        toast("Asset is already allocated — use Transfer instead", "error");
      } else {
        toast("Failed to allocate asset", "error");
        console.error("Allocate error:", err);
      }
    }
  }

  // ─── Transfer request ─────────────────────────────────────────────
  async function handleTransfer() {
    const errors = validateTransfer(transferForm, transferMode);
    setTransferErrors(errors);
    if (hasErrors(errors)) return;

    const payload: TransferPayload = {
      asset_id:    selectedAssetId,
      to_user_id:  transferMode === "employee" ? transferForm.to_user_id : undefined,
      to_dept_id:  transferMode === "dept"     ? transferForm.to_dept_id : undefined,
      reason:      transferForm.reason,
    };
    try {
      await allocations.requestTransfer(payload);
      toast("Transfer request submitted");
      loadData();
    } catch (err) {
      console.error("Transfer error:", err);
      toast("Failed to submit transfer request", "error");
    }
    setTransferForm({ to_user_id: "", to_dept_id: "", reason: "" });
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
    } catch (err) {
      console.error("Return error:", err);
      toast("Failed to record return", "error");
    }
    setReturnAlloc(null);
  }

  // ─── Transfer approve/reject ───────────────────────────────────────
  async function approveTransfer(id: string) {
    try {
      await allocations.approveTransfer(id);
      toast("Transfer approved");
      loadData();
    } catch (err) {
      console.error("Approve error:", err);
      toast("Failed to approve transfer", "error");
    }
  }
  async function rejectTransfer(id: string) {
    const note = prompt("Rejection note:");
    if (!note) return;
    try {
      await allocations.rejectTransfer(id, note);
      toast("Transfer rejected");
      loadData();
    } catch (err) {
      console.error("Reject error:", err);
      toast("Failed to reject transfer", "error");
    }
  }

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
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong> Please check your server connection.{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>
            Retry
          </button>
        </div>
      ) : tab === "allocate" ? (
        <>
          {/* Asset selector */}
          <div style={{ marginBottom: 16, maxWidth: 480 }}>
            <FormField label="Asset">
              <Select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                options={assetList.map((a) => ({ value: a.id, label: `${a.asset_tag} – ${a.name}` }))}
              />
            </FormField>
          </div>

          {/* Status banner */}
          {selectedAsset && (
            <div className={`alert ${isAllocated ? "alert-danger" : "alert-success"} animate-fade-down`} style={{ marginBottom: 20 }}>
              {isAllocated ? (
                <>
                  Already allocated to{" "}
                  <strong>
                    {currentAlloc?.assigned_to_user_name ??
                      currentAlloc?.assigned_to_dept_name ??
                      selectedAsset.assigned_to_name ??
                      "—"}
                  </strong>
                  {selectedAsset.department_name ? ` (${selectedAsset.department_name})` : ""}
                  .<br />
                  Direct re-allocation is blocked — submit a transfer request below.
                </>
              ) : (
                <>
                  <AssetStatusBadge status={selectedAsset.status} />{" "}
                  <strong>{selectedAsset.asset_tag}</strong> is available — you can allocate it directly.
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

            {/* Transfer-mode toggle (shown only when asset is already allocated) */}
            {isAllocated && (
              <div className="tab-bar" style={{ marginBottom: 14 }}>
                <button className={`tab-btn${transferMode === "employee" ? " active" : ""}`} onClick={() => { setTransferMode("employee"); setTransferForm({ ...transferForm, to_dept_id: "" }); }}>To Employee</button>
                <button className={`tab-btn${transferMode === "dept"     ? " active" : ""}`} onClick={() => { setTransferMode("dept");     setTransferForm({ ...transferForm, to_user_id: "" }); }}>To Department</button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isAllocated ? "1fr 1fr" : "1fr", gap: 12 }}>
              {isAllocated && (
                <FormField label="From">
                  <Input
                    value={
                      currentAlloc?.assigned_to_user_name ??
                      currentAlloc?.assigned_to_dept_name ??
                      selectedAsset?.assigned_to_name ??
                      ""
                    }
                    readOnly
                  />
                </FormField>
              )}
              <FormField
                label="To"
                error={allocErrors.to || transferErrors.to_user_id || transferErrors.to_dept_id}
                required
              >
                <Select
                  value={
                    isAllocated
                      ? (transferMode === "employee" ? transferForm.to_user_id : transferForm.to_dept_id)
                      : (allocMode === "employee" ? toUserId : toDeptId)
                  }
                  error={allocErrors.to || transferErrors.to_user_id || transferErrors.to_dept_id}
                  placeholder={
                    (isAllocated ? transferMode : allocMode) === "employee"
                      ? "Select Employee…"
                      : "Select Department…"
                  }
                  options={
                    (isAllocated ? transferMode : allocMode) === "employee"
                      ? empList.map((e) => ({ value: e.id, label: e.name }))
                      : deptList.map((d) => ({ value: d.id, label: d.name }))
                  }
                  onChange={(e) => {
                    if (isAllocated) {
                      transferMode === "employee"
                        ? setTransferForm({ ...transferForm, to_user_id: e.target.value })
                        : setTransferForm({ ...transferForm, to_dept_id: e.target.value });
                    } else {
                      allocMode === "employee"
                        ? setToUserId(e.target.value)
                        : setToDeptId(e.target.value);
                    }
                  }}
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



          {/* Active allocations table */}
          {allocList.filter((a) => a.is_active).length > 0 && (() => {
            const activeAllocs = allocList.filter((a) => a.is_active);
            const totalPages   = Math.max(1, Math.ceil(activeAllocs.length / PAGE_SIZE));
            const pageItems    = activeAllocs.slice((allocPage - 1) * PAGE_SIZE, allocPage * PAGE_SIZE);
            return (
              <>
                <h2 className="section-title" style={{ fontSize: 15, marginTop: 28 }}>Active Allocations</h2>
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <table className="af-table">
                    <thead>
                      <tr><th>Asset</th><th>Assigned To</th><th>Expected Return</th><th>Overdue</th><th></th></tr>
                    </thead>
                    <tbody>
                      {pageItems.map((a, i) => (
                        <tr key={a.id} className={`animate-fade-up stagger-${Math.min(i+1,6)}`}>
                          <td style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12.5 }}>{a.asset_tag}</td>
                          <td>{a.assigned_to_user_name ?? a.assigned_to_dept_name ?? "—"}</td>
                          <td style={{ color: "var(--text-secondary)" }}>
                            {a.expected_return_at ? new Date(a.expected_return_at).toLocaleDateString() : "—"}
                          </td>
                          <td>{a.is_overdue && <span className="badge badge-red">Overdue</span>}</td>
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
                  <Pagination
                    page={allocPage}
                    totalPages={totalPages}
                    onChange={setAllocPage}
                    total={activeAllocs.length}
                    pageSize={PAGE_SIZE}
                  />
                </div>
              </>
            );
          })()}
        </>
      ) : (
        /* ── Transfers Tab ──────────────────────────────────────── */
        <>
          {transferList.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)" }}>
              No transfer requests yet.
            </div>
          ) : (() => {
            const totalPages = Math.max(1, Math.ceil(transferList.length / PAGE_SIZE));
            const pageItems  = transferList.slice((transferPage - 1) * PAGE_SIZE, transferPage * PAGE_SIZE);
            return (
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table className="af-table">
                  <thead>
                    <tr><th>Asset</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {pageItems.map((t, i) => (
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
                <Pagination
                  page={transferPage}
                  totalPages={totalPages}
                  onChange={setTransferPage}
                  total={transferList.length}
                  pageSize={PAGE_SIZE}
                />
              </div>
            );
          })()}
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
