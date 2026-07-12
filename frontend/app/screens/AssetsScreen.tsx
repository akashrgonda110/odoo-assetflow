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
  const [formErrors, setFormErrors] = useState<Partial<AssetForm>>({});
  const [isBookable, setIsBookable] = useState(false);
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detail drawer
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [aRes, cRes] = await Promise.all([assetsApi.list(), categories.list()]);
      setAssets(aRes.data);
      setCats(cRes.data);
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
      a.tag.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      (a.serial_number ?? "").toLowerCase().includes(q);
    const matchC = !catFilter  || a.category_id === catFilter;
    const matchS = !statFilter || a.status       === statFilter;
    return matchQ && matchC && matchS;
  });

  // ─── Register asset ───────────────────────────────────────────────
  function openRegister() {
    setForm({ name: "", category_id: catList[0]?.id ?? "", condition: "good", location: "", acquisition_cost: "", serial_number: "" });
    setFormErrors({});
    setIsBookable(false);
    setNotes("");
    setShowRegister(true);
  }

  async function submitRegister() {
    const errors = validateAsset(form);
    setFormErrors(errors);
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
      notes:            notes || undefined,
    };

    try {
      await assetsApi.create(payload);
      toast("Asset registered successfully");
      setShowRegister(false);
      loadData();
    } catch (err) {
      console.error("Asset create error:", err);
      toast("Failed to register asset", "error");
    } finally {
      setSubmitting(false);
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  className={`animate-fade-up stagger-${Math.min(i + 1, 6)} clickable`}
                  onClick={() => setDetailAsset(a)}
                  title="Click to view details"
                >
                  <td style={{ fontWeight: 700, fontFamily: "monospace", fontSize: 12.5 }}>{a.tag}</td>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td>{a.category_name ?? a.category_id}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.condition}</td>
                  <td><AssetStatusBadge status={a.status} /></td>
                  <td style={{ color: "var(--text-secondary)" }}>{a.location ?? "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{a.assigned_to_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
            Showing {filtered.length} of {assetList.length} assets
          </div>
        </div>
      )}

      {/* ── Register Modal ─────────────────────────────────────────── */}
      {showRegister && (
        <Modal title="Register Asset" onClose={() => setShowRegister(false)} width={520}>
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
              <Input type="date" onChange={() => {}} />
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
        <Modal title={`${detailAsset.tag} — ${detailAsset.name}`} onClose={() => setDetailAsset(null)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px", fontSize: 13.5 }}>
            {[
              ["Category",    detailAsset.category_name],
              ["Status",      <AssetStatusBadge key="s" status={detailAsset.status} />],
              ["Condition",   <span key="c" style={{ textTransform: "capitalize" }}>{detailAsset.condition}</span>],
              ["Location",    detailAsset.location ?? "—"],
              ["Serial No.",  detailAsset.serial_number ?? "—"],
              ["Bookable",    detailAsset.is_bookable ? "Yes" : "No"],
              ["Assigned To", detailAsset.assigned_to_name ?? "—"],
              ["Department",  detailAsset.department_name ?? "—"],
            ].map(([label, val]) => (
              <div key={String(label)}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, fontWeight: 600 }}>
                  {label}
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{val}</div>
              </div>
            ))}
          </div>
          {detailAsset.notes && (
            <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--bg)", borderRadius: 8, fontSize: 13, color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {detailAsset.notes}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
