/* ═══════════════════════════════════════════════════════════════════
   AssetFlow – Shared Type Definitions
   Mirrors the backend Postman collection exactly.
═══════════════════════════════════════════════════════════════════ */

// ─── Auth ──────────────────────────────────────────────────────────
export type Role = "admin" | "asset_manager" | "department_head" | "employee";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department_id?: string;
  department_name?: string;
  phone?: string;
  is_active: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

// ─── Department ────────────────────────────────────────────────────
export type DepartmentStatus = "active" | "inactive";

export interface Department {
  id: string;
  name: string;
  description?: string;
  head_name?: string;
  parent_name?: string;
  status: DepartmentStatus;
  created_at?: string;
}

export interface DepartmentPayload {
  name: string;
  description?: string;
  status: DepartmentStatus;
  head_id?: string;
  parent_id?: string;
}

// ─── Category ─────────────────────────────────────────────────────
export interface CategoryField {
  field: string;
  label: string;
  type: "text" | "date" | "number" | "select";
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  custom_fields?: CategoryField[];
  asset_count?: number;
  created_at?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  custom_fields?: CategoryField[];
}

// ─── Employee ─────────────────────────────────────────────────────
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: Role;
  department_id?: string;
  department_name?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
}

// ─── Asset ────────────────────────────────────────────────────────
export type AssetStatus =
  | "available"
  | "allocated"
  | "reserved"
  | "under_maintenance"
  | "lost"
  | "retired"
  | "disposed";

export type AssetCondition = "new" | "good" | "fair" | "poor" | "damaged";

export interface Asset {
  id: string;
  asset_tag: string;
  tag?: string;
  name: string;
  category_id: string;
  category_name?: string;
  serial_number?: string;
  acquisition_date?: string;
  acquisition_cost?: number;
  condition: AssetCondition;
  status: AssetStatus;
  location?: string;
  is_bookable: boolean;
  notes?: string;
  assigned_to_name?: string;
  assigned_to_dept_name?: string;
  department_name?: string;
  created_at?: string;
}

export interface AssetPayload {
  name: string;
  category_id: string;
  serial_number?: string;
  acquisition_date?: string;
  acquisition_cost?: number;
  condition: AssetCondition;
  location?: string;
  is_bookable: boolean;
  notes?: string;
}

export interface AssetHistoryEntry {
  id: string;
  action: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

// ─── Allocation ────────────────────────────────────────────────────
export interface Allocation {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_name?: string;
  assigned_to_user?: string;
  assigned_to_user_name?: string;
  assigned_to_dept?: string;
  assigned_to_dept_name?: string;
  allocated_by_name?: string;
  expected_return_at?: string;
  returned_at?: string;
  return_condition?: AssetCondition;
  return_notes?: string;
  is_active: boolean;
  is_overdue?: boolean;
  created_at?: string;
}

export interface AllocationPayload {
  asset_id: string;
  assigned_to_user?: string;
  assigned_to_dept?: string;
  expected_return_at?: string;
}

export interface ReturnPayload {
  return_condition: AssetCondition;
  return_notes?: string;
}

// ─── Transfer ─────────────────────────────────────────────────────
export type TransferStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Transfer {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_name?: string;
  from_user_name?: string;
  to_user_id: string;
  to_user_name?: string;
  reason: string;
  status: TransferStatus;
  rejection_note?: string;
  created_at?: string;
}

export interface TransferPayload {
  asset_id: string;
  to_user_id?: string;
  to_dept_id?: string;
  reason: string;
}

// ─── Booking ──────────────────────────────────────────────────────
export type BookingStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface Booking {
  id: string;
  asset_id: string;
  asset_name?: string;
  title: string;
  booked_by?: string;
  booked_by_name?: string;
  start_time: string;
  end_time: string;
  notes?: string;
  status: BookingStatus;
  cancel_reason?: string;
  created_at?: string;
}

export interface BookingPayload {
  asset_id: string;
  title: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

// ─── Maintenance ──────────────────────────────────────────────────
export type MaintenanceStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "technician_assigned"
  | "in_progress"
  | "resolved";

export type Priority = "low" | "medium" | "high" | "critical";

export interface MaintenanceRequest {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_name?: string;
  issue_desc: string;
  priority: Priority;
  status: MaintenanceStatus;
  raised_by_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  rejection_note?: string;
  resolution_note?: string;
  created_at?: string;
  resolved_at?: string;
}

export interface MaintenancePayload {
  asset_id: string;
  issue_desc: string;
  priority: Priority;
}

// ─── Audit ────────────────────────────────────────────────────────
export type AuditCycleStatus = "open" | "closed";
export type VerificationStatus = "pending" | "verified" | "missing" | "damaged";

export interface AuditItem {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_name?: string;
  expected_location?: string;
  verification: VerificationStatus;
  notes?: string;
  verified_by?: string;
}

export interface AuditCycle {
  id: string;
  title: string;
  scope_dept?: string;
  scope_dept_name?: string;
  start_date: string;
  end_date: string;
  notes?: string;
  status: AuditCycleStatus;
  auditors?: { id: string; name: string }[];
  items?: AuditItem[];
  created_at?: string;
}

export interface AuditCyclePayload {
  title: string;
  scope_dept?: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────
export interface DashboardKPIs {
  total_assets: number;
  available: number;
  allocated: number;
  under_maintenance: number;
  active_bookings: number;
  pending_transfers: number;
  upcoming_returns: number;
  overdue_allocations: number;
}

export interface ActivityItem {
  id: string;
  description: string;
  entity_type: string;
  entity_id: string;
  performed_by_name?: string;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────────
export type NotificationType =
  | "asset_assigned"
  | "maintenance_approved"
  | "maintenance_rejected"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "transfer_approved"
  | "transfer_rejected"
  | "overdue_return"
  | "audit_discrepancy";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  created_at: string;
  entity_id?: string;
}

// ─── Reports ──────────────────────────────────────────────────────
export interface UtilizationDept {
  department_name: string;
  total: number;
  allocated: number;
  utilization_pct: number;
}

export interface MostUsedAsset {
  asset_tag: string;
  asset_name: string;
  usage_count: number;
}

export interface IdleAsset {
  asset_tag: string;
  asset_name: string;
  idle_days: number;
  location?: string;
}

export interface MaintenanceFrequency {
  asset_tag: string;
  asset_name: string;
  request_count: number;
}

export interface DeptAllocationSummary {
  department_name: string;
  allocated_count: number;
  employee_count: number;
}

// ─── Generic API Response ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── Form Validation ──────────────────────────────────────────────
export type ValidationErrors<T> = Partial<Record<keyof T, string>>;
