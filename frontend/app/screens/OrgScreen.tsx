"use client";

import { useState, useEffect, useCallback } from "react";
import { departments, categories, employees, auth as authApi } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../components/ui/Toast";
import { Modal } from "../components/ui/Modal";
import { FormField, Input, Select, Textarea } from "../components/ui/FormField";
import { DeptStatusBadge, RoleBadge } from "../components/ui/Badge";
import { Table } from "../components/ui/Table";
import { Spinner } from "../components/ui/Spinner";
import type {
  Department, DepartmentPayload,
  Category, CategoryPayload,
  Employee,
} from "../lib/types";
import { required, hasErrors, isEmail, isStrongPassword } from "../lib/validation";

type Tab = "departments" | "categories" | "employees";

interface AddEmpForm {
  name: string;
  email: string;
  password: string;
  role: string;
  department_id: string;
}
type AddEmpErrors = Partial<Record<keyof AddEmpForm, string>>;

export function OrgScreen() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [tab, setTab]             = useState<Tab>("departments");
  const [loadingData, setLoading] = useState(true);
  const [apiError, setApiError]   = useState(false);

  const [depts, setDepts] = useState<Department[]>([]);
  const [cats,  setCats]  = useState<Category[]>([]);
  const [emps,  setEmps]  = useState<Employee[]>([]);

  // ── Department modal ──────────────────────────────────────────────
  const [showDeptModal, setDeptModal] = useState(false);
  const [editingDept,   setEditDept]  = useState<Department | null>(null);
  const [deptForm,  setDeptForm]  = useState<DepartmentPayload>({ name: "", status: "active" });
  const [deptErrors, setDeptErrors] = useState<Partial<DepartmentPayload>>({});

  // ── Delete confirm modal ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; type: "dept" | "cat"; assetCount?: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Category modal ────────────────────────────────────────────────
  const [showCatModal, setCatModal] = useState(false);
  const [editingCat,   setEditCat]  = useState<Category | null>(null);
  const [catForm,   setCatForm]   = useState<CategoryPayload>({ name: "" });
  const [catErrors, setCatErrors] = useState<Partial<CategoryPayload>>({});

  // ── Employee role modal ───────────────────────────────────────────
  const [showEmpModal, setEmpModal]  = useState(false);
  const [editingEmp,   setEditEmp]   = useState<Employee | null>(null);
  const [empRole, setEmpRole] = useState("");

  // ── Add Employee modal ────────────────────────────────────────────
  const [showAddEmp,       setShowAddEmp]       = useState(false);
  const [addEmpForm,       setAddEmpForm]       = useState<AddEmpForm>({ name: "", email: "", password: "", role: "employee", department_id: "" });
  const [addEmpErrors,     setAddEmpErrors]     = useState<AddEmpErrors>({});
  const [addEmpSubmitting, setAddEmpSubmitting] = useState(false);

  // ── Load data ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [dRes, cRes, eRes] = await Promise.all([
        departments.list(),
        categories.list(),
        employees.list(),
      ]);
      setDepts(Array.isArray(dRes.data) ? dRes.data : []);
      setCats(Array.isArray(cRes.data) ? cRes.data : []);
      setEmps(eRes.data?.users ?? []);
    } catch (err) {
      console.error("Org load error:", err);
      setApiError(true);
      toast("Failed to load organization data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Department CRUD ───────────────────────────────────────────────
  function openAddDept() {
    setEditDept(null);
    setDeptForm({ name: "", status: "active", description: "" });
    setDeptErrors({});
    setDeptModal(true);
  }

  function openEditDept(d: Department) {
    setEditDept(d);
    setDeptForm({ name: d.name, status: d.status, description: d.description ?? "" });
    setDeptErrors({});
    setDeptModal(true);
  }

  async function saveDept() {
    const e: Partial<DepartmentPayload> = {};
    e.name = required(deptForm.name, "Name");
    setDeptErrors(e);
    if (hasErrors(e)) return;
    try {
      if (editingDept) {
        await departments.update(editingDept.id, deptForm);
        toast("Department updated");
      } else {
        await departments.create(deptForm);
        toast("Department created");
      }
      setDeptModal(false);
      loadAll();
    } catch (err) {
      console.error("Dept save error:", err);
      toast("Failed to save department", "error");
    }
  }

  // ── Delete (shared confirm modal) ─────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === "dept") {
        await departments.remove(deleteTarget.id);
        toast(`Department "${deleteTarget.name}" deleted`);
      } else {
        await categories.remove(deleteTarget.id);
        toast(`Category "${deleteTarget.name}" deleted`);
      }
      setDeleteTarget(null);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  }

  // ── Category CRUD ─────────────────────────────────────────────────
  function openAddCat() {
    setEditCat(null);
    setCatForm({ name: "", description: "" });
    setCatErrors({});
    setCatModal(true);
  }

  function openEditCat(c: Category) {
    setEditCat(c);
    setCatForm({ name: c.name, description: c.description ?? "" });
    setCatErrors({});
    setCatModal(true);
  }

  async function saveCat() {
    const e: Record<string, string | undefined> = {};
    e.name = required(catForm.name, "Name");
    setCatErrors(e as Partial<CategoryPayload>);
    if (Object.values(e).some(Boolean)) return;
    try {
      if (editingCat) {
        await categories.update(editingCat.id, catForm);
        toast("Category updated");
      } else {
        await categories.create(catForm);
        toast("Category created");
      }
      setCatModal(false);
      loadAll();
    } catch (err) {
      console.error("Cat save error:", err);
      toast("Failed to save category", "error");
    }
  }

  // ── Employee management ───────────────────────────────────────────
  function openEmpModal(emp: Employee) {
    setEditEmp(emp);
    setEmpRole(emp.role);
    setEmpModal(true);
  }

  async function saveEmpRole() {
    if (!editingEmp) return;
    try {
      await employees.setRole(editingEmp.id, empRole);
      toast(`${editingEmp.name} promoted to ${empRole.replace("_", " ")}`);
      loadAll();
    } catch {
      setEmps((prev) => prev.map((e) => e.id === editingEmp.id ? { ...e, role: empRole as Employee["role"] } : e));
      toast("Role updated (offline)");
    }
    setEmpModal(false);
  }

  async function toggleEmpStatus(emp: Employee) {
    const next = !emp.is_active;
    try {
      await employees.setStatus(emp.id, next);
      toast(`${emp.name} ${next ? "reactivated" : "deactivated"}`);
      loadAll();
    } catch {
      setEmps((prev) => prev.map((e) => e.id === emp.id ? { ...e, is_active: next } : e));
      toast("Status updated (offline)");
    }
  }

  // ── Add Employee ──────────────────────────────────────────────────
  function openAddEmp() {
    setAddEmpForm({ name: "", email: "", password: "", role: "employee", department_id: depts[0]?.id ?? "" });
    setAddEmpErrors({});
    setShowAddEmp(true);
  }

  async function saveAddEmp() {
    const e: AddEmpErrors = {};
    e.name     = required(addEmpForm.name, "Name") ?? (addEmpForm.name.trim().length < 2 ? "Name must be at least 2 characters." : undefined);
    e.email    = required(addEmpForm.email, "Email") ?? isEmail(addEmpForm.email);
    e.password = required(addEmpForm.password, "Password") ?? isStrongPassword(addEmpForm.password);
    e.role     = required(addEmpForm.role, "Role");
    setAddEmpErrors(e);
    if (hasErrors(e)) return;

    setAddEmpSubmitting(true);
    try {
      const res = await authApi.register({
        name:     addEmpForm.name.trim(),
        email:    addEmpForm.email.trim(),
        password: addEmpForm.password,
      });
      if (addEmpForm.role !== "employee" || addEmpForm.department_id) {
        const userId = res.data.user.id;
        if (addEmpForm.role !== "employee") {
          await employees.setRole(userId, addEmpForm.role);
        }
        if (addEmpForm.department_id) {
          await employees.updateProfile(userId, { department_id: addEmpForm.department_id });
        }
      }
      toast(`Employee "${addEmpForm.name}" added successfully`);
      setShowAddEmp(false);
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("already") || msg.includes("409")) {
        setAddEmpErrors((prev) => ({ ...prev, email: "An account with this email already exists." }));
      } else {
        toast("Failed to add employee — " + (msg || "unknown error"), "error");
      }
      console.error("Add employee error:", err);
    } finally {
      setAddEmpSubmitting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <h1 className="page-title">Organization Setup</h1>

      {/* Tab bar */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        {(["departments", "categories", "employees"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-btn${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {isAdmin && (
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={
              tab === "departments" ? openAddDept
              : tab === "categories" ? openAddCat
              : openAddEmp
            }
          >
            + Add
          </button>
        )}
      </div>

      {loadingData ? (
        <Spinner fullPage />
      ) : apiError ? (
        <div className="alert alert-danger">
          <strong>Backend unreachable.</strong>{" "}
          <button className="btn btn-sm btn-outline" style={{ marginLeft: 10 }} onClick={loadAll}>Retry</button>
        </div>
      ) : (
        <>
          {/* ── Departments ─────────────────────────────────────── */}
          {tab === "departments" && (
            <>
              <Table
                columns={[
                  { key: "name",        header: "Department", render: (d) => <strong>{d.name}</strong> },
                  { key: "head_name",   header: "Head",       render: (d) => d.head_name ?? <span style={{ color: "var(--text-muted)" }}>—</span> },
                  { key: "parent_name", header: "Parent Dept",render: (d) => d.parent_name ?? <span style={{ color: "var(--text-muted)" }}>—</span> },
                  { key: "status",      header: "Status",     render: (d) => <DeptStatusBadge status={d.status} /> },
                  {
                    key: "actions", header: "",
                    render: (d) => isAdmin ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(ev) => { ev.stopPropagation(); openEditDept(d); }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: "var(--danger)" }}
                          onClick={(ev) => { ev.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: d.id, name: d.name, type: "dept" }); }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null,
                  },
                ]}
                data={depts}
                rowKey={(d) => d.id}
                emptyMessage="No departments found."
              />
              <p style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
                Editing a department here also drives the picklist in Asset Allocation &amp; Transfer.
              </p>
            </>
          )}

          {/* ── Categories ──────────────────────────────────────── */}
          {tab === "categories" && (
            <Table
              columns={[
                { key: "name",        header: "Category",    render: (c) => <strong>{c.name}</strong> },
                { key: "description", header: "Description", render: (c) => c.description ?? <span style={{ color: "var(--text-muted)" }}>—</span> },
                {
                  key: "actions", header: "",
                  render: (c) => isAdmin ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(ev) => { ev.stopPropagation(); openEditCat(c); }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)" }}
                        onClick={(ev) => { ev.stopPropagation(); setDeleteError(null); setDeleteTarget({ id: c.id, name: c.name, type: "cat", assetCount: c.asset_count ?? 0 }); }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null,
                },
              ]}
              data={cats}
              rowKey={(c) => c.id}
              emptyMessage="No categories found."
            />
          )}

          {/* ── Employees ───────────────────────────────────────── */}
          {tab === "employees" && (
            <Table
              columns={[
                { key: "name",            header: "Name",       render: (e) => <strong>{e.name}</strong> },
                { key: "email",           header: "Email",      render: (e) => <span style={{ color: "var(--text-secondary)" }}>{e.email}</span> },
                { key: "department_name", header: "Department", render: (e) => e.department_name ?? "—" },
                { key: "role",            header: "Role",       render: (e) => <RoleBadge role={e.role} /> },
                {
                  key: "is_active", header: "Status",
                  render: (e) => (
                    <span className={`badge badge-${e.is_active ? "green" : "gray"}`}>
                      {e.is_active ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  key: "actions", header: "",
                  render: (e) => isAdmin ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(ev) => { ev.stopPropagation(); openEmpModal(e); }}
                      >
                        Role
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: e.is_active ? "var(--danger)" : "var(--accent-hover)" }}
                        onClick={(ev) => { ev.stopPropagation(); toggleEmpStatus(e); }}
                      >
                        {e.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  ) : null,
                },
              ]}
              data={emps}
              rowKey={(e) => e.id}
              emptyMessage="No employees found."
            />
          )}
        </>
      )}

      {/* ── Department Modal ──────────────────────────────────────── */}
      {showDeptModal && (
        <Modal
          title={editingDept ? "Edit Department" : "Add Department"}
          onClose={() => setDeptModal(false)}
        >
          <FormField label="Name" error={deptErrors.name} required>
            <Input
              value={deptForm.name}
              error={deptErrors.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Engineering"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={deptForm.description ?? ""}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Optional description…"
            />
          </FormField>
          <FormField label="Status" required>
            <Select
              value={deptForm.status}
              onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as "active" | "inactive" })}
              options={[
                { value: "active",   label: "Active"   },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setDeptModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveDept}>Save</button>
          </div>
        </Modal>
      )}

      {/* ── Category Modal ───────────────────────────────────────── */}
      {showCatModal && (
        <Modal
          title={editingCat ? "Edit Category" : "Add Category"}
          onClose={() => setCatModal(false)}
        >
          <FormField label="Name" error={catErrors.name} required>
            <Input
              value={catForm.name}
              error={catErrors.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Electronics"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={catForm.description ?? ""}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Optional description…"
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setCatModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveCat}>Save</button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────── */}
      {deleteTarget && (
        <Modal
          title={`Delete ${deleteTarget.type === "dept" ? "Department" : "Category"}`}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          width={420}
        >
          {/* Pre-flight warning for categories with assets */}
          {deleteTarget.type === "cat" && (deleteTarget.assetCount ?? 0) > 0 ? (
            <>
              <div style={{ background: "var(--danger-light, #fef2f2)", border: "1px solid var(--danger)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13.5, color: "var(--danger)" }}>
                  Cannot delete — {deleteTarget.assetCount} asset{deleteTarget.assetCount !== 1 ? "s" : ""} assigned
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                  Reassign or retire all assets in the <strong>{deleteTarget.name}</strong> category before deleting it.
                  Go to the <strong>Assets</strong> tab to update each asset's category.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-outline" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 16 }}>
                Are you sure you want to delete{" "}
                <strong style={{ color: "var(--text-primary)" }}>{deleteTarget.name}</strong>?
                {deleteTarget.type === "dept" && (
                  <span style={{ display: "block", marginTop: 6, fontSize: 12.5, color: "var(--text-muted)" }}>
                    This will fail if the department still has active employees.
                  </span>
                )}
              </p>

              {/* Inline error from API */}
              {deleteError && (
                <div style={{ background: "var(--danger-light, #fef2f2)", border: "1px solid var(--danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "var(--danger)" }}>
                  {deleteError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn btn-outline" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? <span className="spinner" style={{ width: 14, height: 14 }} /> : "Delete"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {/* ── Employee Role Modal ───────────────────────────────────── */}
      {showEmpModal && editingEmp && (
        <Modal title={`Change Role — ${editingEmp.name}`} onClose={() => setEmpModal(false)}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
            Current role: <strong>{editingEmp.role.replace(/_/g, " ")}</strong>
          </p>
          <FormField label="New Role" required>
            <Select
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value)}
              options={[
                { value: "employee",        label: "Employee"        },
                { value: "department_head", label: "Department Head" },
                { value: "asset_manager",   label: "Asset Manager"   },
                { value: "admin",           label: "Admin"           },
              ]}
            />
          </FormField>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-outline" onClick={() => setEmpModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEmpRole}>Promote</button>
          </div>
        </Modal>
      )}

      {/* ── Add Employee Modal ────────────────────────────────────── */}
      {showAddEmp && (
        <Modal title="Add Employee" onClose={() => setShowAddEmp(false)} width={480}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Full Name" error={addEmpErrors.name} required>
                <Input
                  value={addEmpForm.name}
                  error={addEmpErrors.name}
                  placeholder="e.g. Jane Smith"
                  onChange={(e) => setAddEmpForm({ ...addEmpForm, name: e.target.value })}
                />
              </FormField>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Email Address" error={addEmpErrors.email} required>
                <Input
                  type="email"
                  value={addEmpForm.email}
                  error={addEmpErrors.email}
                  placeholder="e.g. jane@company.com"
                  onChange={(e) => setAddEmpForm({ ...addEmpForm, email: e.target.value })}
                />
              </FormField>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Password" error={addEmpErrors.password} required>
                <Input
                  type="password"
                  value={addEmpForm.password}
                  error={addEmpErrors.password}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  onChange={(e) => setAddEmpForm({ ...addEmpForm, password: e.target.value })}
                />
              </FormField>
            </div>
            <FormField label="Role" error={addEmpErrors.role} required>
              <Select
                value={addEmpForm.role}
                error={addEmpErrors.role}
                options={[
                  { value: "employee",        label: "Employee"        },
                  { value: "department_head", label: "Department Head" },
                  { value: "asset_manager",   label: "Asset Manager"   },
                  { value: "admin",           label: "Admin"           },
                ]}
                onChange={(e) => setAddEmpForm({ ...addEmpForm, role: e.target.value })}
              />
            </FormField>
            <FormField label="Department">
              <Select
                value={addEmpForm.department_id}
                placeholder="None"
                options={depts.map((d) => ({ value: d.id, label: d.name }))}
                onChange={(e) => setAddEmpForm({ ...addEmpForm, department_id: e.target.value })}
              />
            </FormField>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            The employee will be able to log in immediately with these credentials.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn-outline" onClick={() => setShowAddEmp(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveAddEmp} disabled={addEmpSubmitting}>
              {addEmpSubmitting
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Adding…</>
                : "Add Employee"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
