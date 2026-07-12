"use client";

import { useState, useEffect, useCallback } from "react";
import { assets as assetsApi, categories } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select, Textarea } from "../components/ui/FormField";
import { AssetStatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/Table";
import type { Asset, Category, AssetPayload, AssetStatus, AssetCondition } from "../lib/types";
import { validateAsset, hasErrors, type AssetForm } from "../lib/validation";
import { Pagination } from "../components/ui/Pagination";

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: AssetStatus | ""; label: string }[] = [
  { value: "",                  label: "All Status"        },
  { value: "available",         label: "Available"         },
  { value: "allocated",         label: "Allocated"         },
  { value: "reserved",          label: "Reserved"          },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "lost",              label: "Lost"              },
  { value: "retired",           label: "Retired"           },
];

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: "new",     label: "New"     },
  { value: "good",    label: "Good"    },
  { value: "fair",    label: "Fair"    },
  { value: "poor",    label: "Poor"    },
  { value: "damaged", label: "Damaged" },
];

export function AssetsScreen() {
  const { canManage } = useAuth();
  const { toast } = useToast();

  const [assetList, setAssets]   = useState<Asset[]>([]);
  const [catList, setCats]       = useState<Category[]>([]);
  const [loading, setLoading]    = useState(true);
  const [apiError, setApiError]  = useState(false);

  // Filters
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("");
  const [statFilter, setStatFilter]   = useState<AssetStatus | "">("");

  // Register modal
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm]  = useState<AssetForm>({
    name: "", category_id: "", condition: "good",
    location: "", acquisition_cost: "", serial_number: "",
  });
  const [formErrors,    setFormErrors]    = useState<Partial<AssetForm>>({});
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isBookable, setIsBookable]       = useState(false);
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [notes, setNotes]                 = useState("");
  const [submitting, setSubmitting]       = useState(false);

  // Detail drawer
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  // Edit modal
  const [editAsset,    setEditAsset]   = useState<Asset | null>(null);
  const [editForm,     setEditForm]    = useState<AssetForm>({ name: "", category_id: "", condition: "good", location: "", acquisition_cost: "", serial_number: "" });
  const [editErrors,   setEditErrors]  = useState<Partial<AssetForm>>({});
  const [editDate,     setEditDate]    = useState("");
  const [editBookable, setEditBookable]= useState(false);
  const [editNotes,    setEditNotes]   = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError,    setEditError]   = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [aRes, cRes] = await Promise.all([assetsApi.list(), categories.list()]);
      // Backend returns a paginated envelope: { assets: [...], total, limit, offset }
      const assetData = aRes.data?.assets ?? [];
      setAssets(Array.isArray(assetData) ? assetData : []);
      setCats(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      console.error("Assets load error:", err);
      setApiError(true);
      toast("Failed to load assets — check backend connection", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Filtered list ────────────────────────────────────────────────
  const filtered = assetList.filter((a) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      a.asset_tag.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.serial_number ?? "").toLowerCase().includes(q);
    const matchC = !catFilter  || a.category_id === catFilter;
    const matchS = !statFilter || a.status       === statFilter;
    return matchQ && matchC && matchS;
  });

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [search, catFilter, statFilter]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ─── Register asset ───────────────────────────────────────────────
  function openRegister() {
    setForm({ name: "", category_id: catList[0]?.id ?? "", condition: "good", location: "", acquisition_cost: "", serial_number: "" });
    setFormErrors({});
    setRegisterError(null);
    setIsBookable(false);
    setAcquisitionDate("");
    setNotes("");
    setShowRegister(true);
  }

  async function submitRegister() {
    const errors = validateAsset(form);
    setFormErrors(errors);
    setRegisterError(null);
    if (hasErrors(errors)) return;

    setSubmitting(true);
    const payload: AssetPayload = {
      name:             form.name,
      category_id:      form.category_id,
      condition:        form.condition as AssetCondition,
      location:         form.location,
      is_bookable:      isBookable,
      serial_number:    form.serial_number || undefined,
      acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : undefined,
      acquisition_date: acquisitionDate || undefined,
      notes:            notes || undefined,
    };

    try {
      await assetsApi.create(payload);
      toast("Asset registered successfully");
      setShowRegister(false);
      loadData();
    } catch (err: unknown) {
      const msg    = err instanceof Error ? err.message : "Failed to register asset";
      const status = (err as { status?: number }).status ?? 0;
      console.error("Asset create error:", err);

      if (status === 409 || msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("duplicate")) {
        // Map the field from the backend message
        const isSerial = msg.toLowerCase().includes("serial");
        const isName   = msg.toLowerCase().includes("name");
        if (isSerial) {
          setFormErrors((prev) => ({ ...prev, serial_number: "This serial number is already registered." }));
        } else if (isName) {
          setFormErrors((prev) => ({ ...prev, name: "An asset with this name already exists." }));
        } else {
          setFormErrors((prev) => ({ ...prev, serial_number: "This value is already in use by another asset." }));
        }
        setRegisterError(msg);
      } else {
        setRegisterError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Edit asset ───────────────────────────────────────────────────
  function openEdit(a: Asset) {
    setEditAsset(a);
    setEditForm({
      name:             a.name,
      category_id:      a.category_id,
      condition:        a.condition,
      location:         a.location ?? "",
      acquisition_cost: a.acquisition_cost != null ? String(a.acquisition_cost) : "",
      serial_number:    a.serial_number ?? "",
    });
    setEditDate(a.acquisition_date ? a.acquisition_date.slice(0, 10) : "");
    setEditBookable(a.is_bookable);
    setEditNotes(a.notes ?? "");
    setEditErrors({});
    setEditError(null);
    setDetailAsset(null); // close detail drawer
  }

  async function submitEdit() {
    if (!editAsset) return;
    const errors = validateAsset(editForm);
    setEditErrors(errors);
    setEditError(null);
    if (hasErrors(errors)) return;

    setEditSubmitting(true);
    const payload: Partial<AssetPayload> = {
      name:             editForm.name,
      category_id:      editForm.category_id,
      condition:        editForm.condition as AssetCondition,
      location:         editForm.location,
      is_bookable:      editBookable,
      serial_number:    editForm.serial_number || undefined,
      acquisition_cost: editForm.acquisition_cost ? parseFloat(editForm.acquisition_cost) : undefined,
      acquisition_date: editDate || undefined,
      notes:            editNotes || undefined,
    };

    try {
      await assetsApi.update(editAsset.id, payload);
      toast("Asset updated successfully");
      setEditAsset(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update asset";
      console.error("Asset update error:", err);
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up">
      {/* Header row */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap", justifyContent: "space-between" }}>
        <h1 className="page-title" style={{ margin: 0 }}>Assets</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Input
            type="search"
            style={{ width: 280 }}
            placeholder="Search by tag, serial, or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search assets"
          />
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={openRegister}>
              + Register Asset
            </button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Category filter */}
        <div className="tab-bar">
          <button
            className={`tab-btn${!catFilter ? " active" : ""}`}
            onClick={() => setCatFilter("")}
          >
            All Categories
          </button>
          {catList.map((c) => (
            <button
              key={c.id}
              className={`tab-btn${catFilter === c.id ? " active" : ""}`}
              onClick={() => setCatFilter(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ width: 1, background: "var(--border)", height: 28, margin: "0 4px" }} />

        {/* Status filter */}
        <div className="tab-bar">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              className={`tab-btn${statFilter === s.value ? " active" : ""}`}
              onClick={() => setStatFilter(s.value as AssetStatus | "")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong> Please ensure the backend server is running and try again.{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadData}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No assets found"
          description="Try adjusting your filters or register a new asset."
          action={
            canManage ? (
              <button className="btn btn-primary btn-sm" onClick={openRegister}>
                + Register Asset
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="af-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Name</th>
                <th>Category</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Location</th>
                <th>Assigned To</th>
                {canManage && <th style={{ width: 60 }}></th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((a, i) => (
                <tr
                  key={a.id}
                  className={`animate-fade-up stagger-${Math.min(i + 1, 6)} clickable`}
                  onClick={() => setDetailAsset(a)}
                  title="Click to view details"
                >
                  <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5 }}>{a.asset_tag}</td>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td>{a.category_name ?? a.category_id}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.condition}</td>
                  <td><AssetStatusBadge status={a.status} /></td>
                  <td style={{ color: "var(--text-secondary)" }}>{a.location ?? "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {a.assigned_to_name
                      ? <span>{a.assigned_to_name}{a.assigned_to_dept_name ? <span style={{ color: "var(--text-muted)", fontSize: 12 }}> · {a.assigned_to_dept_name}</span> : null}</span>
                      : a.assigned_to_dept_name
                      ? <span style={{ color: "var(--text-muted)" }}>{a.assigned_to_dept_name}</span>
                      : "—"}
                  </td>
                  {canManage && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => openEdit(a)}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
            total={filtered.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* ── Register Modal ─────────────────────────────────────────── */}
      {showRegister && (
        <Modal title="Register Asset" onClose={() => { setShowRegister(false); setRegisterError(null); }} width={520}>
          {registerError && (
            <div style={{ background: "var(--danger-light)", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--danger)" }}>
              {registerError}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Asset Name" error={formErrors.name} required>
                <Input
                  value={form.name}
                  error={formErrors.name}
                  placeholder="e.g. Dell Latitude 5520"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Category" error={formErrors.category_id} required>
              <Select
                value={form.category_id}
                error={formErrors.category_id}
                options={catList.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select category…"
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              />
            </FormField>

            <FormField label="Condition" error={formErrors.condition} required>
              <Select
                value={form.condition}
                error={formErrors.condition}
                options={CONDITION_OPTIONS}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
              />
            </FormField>

            <FormField label="Location" error={formErrors.location} required>
              <Input
                value={form.location}
                error={formErrors.location}
                placeholder="e.g. HQ Floor 2, Desk A4"
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </FormField>

            <FormField label="Serial Number">
              <Input
                value={form.serial_number}
                placeholder="Optional"
                onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
              />
            </FormField>

            <FormField label="Acquisition Cost (₹)" error={formErrors.acquisition_cost}>
              <Input
                type="number"
                min="0"
                value={form.acquisition_cost}
                error={formErrors.acquisition_cost}
                placeholder="0"
                onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })}
              />
            </FormField>

            <FormField label="Acquisition Date">
              <Input
                type="date"
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
              />
            </FormField>

            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Notes">
                <Textarea
                  value={notes}
                  placeholder="Optional notes…"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                <input
                  type="checkbox"
                  checked={isBookable}
                  onChange={(e) => setIsBookable(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                />
                Mark as bookable (shared resource — can be reserved by time slot)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setShowRegister(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submitRegister} disabled={submitting}>
              {submitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Registering…</> : "Register Asset"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Asset Detail Drawer ────────────────────────────────────── */}
      {detailAsset && (
        <Modal title={`${detailAsset.asset_tag} — ${detailAsset.name}`} onClose={() => setDetailAsset(null)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px", fontSize: 13.5 }}>
            {[
              ["Category",       detailAsset.category_name],
              ["Status",         <AssetStatusBadge key="s" status={detailAsset.status} />],
              ["Condition",      <span key="c" style={{ textTransform: "capitalize" }}>{detailAsset.condition}</span>],
              ["Location",       detailAsset.location ?? "—"],
              ["Serial No.",     detailAsset.serial_number ?? "—"],
              ["Bookable",       detailAsset.is_bookable ? "Yes" : "No"],
              ["Assigned To",    detailAsset.assigned_to_name ?? (detailAsset.assigned_to_dept_name ? null : "—")],
              ["Assigned Dept",  detailAsset.assigned_to_dept_name ?? "—"],
              ["Home Dept",      detailAsset.department_name ?? "—"],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{val ?? "—"}</div>
              </div>
            ))}
          </div>
          {detailAsset.notes && (
            <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--bg)", borderRadius: 8, fontSize: 13, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {detailAsset.notes}
            </div>
          )}
          {canManage && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <button className="btn btn-primary btn-sm" onClick={() => openEdit(detailAsset)}>
                Edit Asset
              </button>
            </div>
          )}
        </Modal>
      )}
      {/* ── Edit Asset Modal ──────────────────────────────────────── */}
      {editAsset && (
        <Modal title={`Edit Asset — ${editAsset.asset_tag}`} onClose={() => { setEditAsset(null); setEditError(null); }} width={520}>
          {editError && (
            <div style={{ background: "var(--danger-light)", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--danger)" }}>
              {editError}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Asset Name" error={editErrors.name} required>
                <Input
                  value={editForm.name}
                  error={editErrors.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Category" error={editErrors.category_id} required>
              <Select
                value={editForm.category_id}
                error={editErrors.category_id}
                options={catList.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
              />
            </FormField>

            <FormField label="Condition" error={editErrors.condition} required>
              <Select
                value={editForm.condition}
                error={editErrors.condition}
                options={CONDITION_OPTIONS}
                onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
              />
            </FormField>

            <FormField label="Location" error={editErrors.location} required>
              <Input
                value={editForm.location}
                error={editErrors.location}
                placeholder="e.g. HQ Floor 2, Desk A4"
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </FormField>

            <FormField label="Serial Number">
              <Input
                value={editForm.serial_number}
                placeholder="Optional"
                onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })}
              />
            </FormField>

            <FormField label="Acquisition Cost (₹)" error={editErrors.acquisition_cost}>
              <Input
                type="number"
                min="0"
                value={editForm.acquisition_cost}
                error={editErrors.acquisition_cost}
                placeholder="0"
                onChange={(e) => setEditForm({ ...editForm, acquisition_cost: e.target.value })}
              />
            </FormField>

            <FormField label="Acquisition Date">
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </FormField>

            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Notes">
                <Textarea
                  value={editNotes}
                  placeholder="Optional notes…"
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </FormField>
            </div>

            <div style={{ gridColumn: "1 / -1", marginBottom: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13.5 }}>
                <input
                  type="checkbox"
                  checked={editBookable}
                  onChange={(e) => setEditBookable(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                />
                Mark as bookable (shared resource — can be reserved by time slot)
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => { setEditAsset(null); setEditError(null); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : "Save Changes"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
