/**
 * AssetFlow API Client
 * All endpoints from the Postman collection, using fetch with JWT Bearer auth.
 * Base URL: http://localhost:5000/api
 */

import type {
  ApiResponse,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  Department,
  DepartmentPayload,
  Category,
  CategoryPayload,
  Employee,
  Asset,
  AssetPayload,
  AssetHistoryEntry,
  Allocation,
  AllocationPayload,
  ReturnPayload,
  Transfer,
  TransferPayload,
  Booking,
  BookingPayload,
  MaintenanceRequest,
  MaintenancePayload,
  AuditCycle,
  AuditCyclePayload,
  AuditItem,
  DashboardKPIs,
  ActivityItem,
  Notification,
  UtilizationDept,
  MostUsedAsset,
  IdleAsset,
  MaintenanceFrequency,
  DeptAllocationSummary,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

// ─── Token management ─────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("af_token");
}

export function setToken(t: string): void {
  localStorage.setItem("af_token", t);
}

export function clearToken(): void {
  localStorage.removeItem("af_token");
  localStorage.removeItem("af_user");
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("af_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeUser(u: AuthUser): void {
  localStorage.setItem("af_user", JSON.stringify(u));
}

// ─── Core fetch wrapper ────────────────────────────────────────────
interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  authOverride?: string; // supply a specific token
}

async function request<T>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body, params, authOverride } = options;

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }

  const token = authOverride ?? getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  const json = (await res.json()) as ApiResponse<T> & { message?: string };

  if (!res.ok) {
    const msg = json.message ?? `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, json);
  }

  return json;
}

// ─── Custom error class ────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// ─────────────────────────────────────────────────────────────────
// 01 – Auth
// ─────────────────────────────────────────────────────────────────
export const auth = {
  register: (payload: RegisterPayload) =>
    request<{ accessToken: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: payload,
    }),

  login: (payload: LoginPayload) =>
    request<{ accessToken: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: payload,
    }),

  me: () => request<AuthUser>("/auth/me"),

  refresh: () => request<{ accessToken: string }>("/auth/refresh", { method: "POST" }),

  logout: () =>
    request<null>("/auth/logout", { method: "POST" }),

  logoutAll: () =>
    request<null>("/auth/logout-all", { method: "POST" }),

  health: () => request<{ status: string }>("/health"),
};

// ─────────────────────────────────────────────────────────────────
// 02 – Departments
// ─────────────────────────────────────────────────────────────────
export const departments = {
  list: (status?: "active" | "inactive") =>
    request<Department[]>("/departments", { params: { status } }),

  get: (id: string) => request<Department>(`/departments/${id}`),

  create: (payload: DepartmentPayload) =>
    request<Department>("/departments", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<DepartmentPayload>) =>
    request<Department>(`/departments/${id}`, { method: "PUT", body: payload }),

  remove: (id: string) =>
    request<null>(`/departments/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────
// 02 – Categories
// ─────────────────────────────────────────────────────────────────
export const categories = {
  list: () => request<Category[]>("/categories"),

  get: (id: string) => request<Category>(`/categories/${id}`),

  create: (payload: CategoryPayload) =>
    request<Category>("/categories", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<CategoryPayload>) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: payload }),

  remove: (id: string) =>
    request<null>(`/categories/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────
// 02 – Employees
// ─────────────────────────────────────────────────────────────────
export const employees = {
  list: (params?: { role?: string; department_id?: string }) =>
    request<Employee[]>("/employees", { params }),

  get: (id: string) => request<Employee>(`/employees/${id}`),

  updateProfile: (id: string, payload: { name?: string; phone?: string }) =>
    request<Employee>(`/employees/${id}`, { method: "PATCH", body: payload }),

  setRole: (id: string, role: string) =>
    request<Employee>(`/employees/${id}/role`, {
      method: "PATCH",
      body: { role },
    }),

  setStatus: (id: string, is_active: boolean) =>
    request<Employee>(`/employees/${id}/status`, {
      method: "PATCH",
      body: { is_active },
    }),
};

// ─────────────────────────────────────────────────────────────────
// 03 – Assets
// ─────────────────────────────────────────────────────────────────
export const assets = {
  list: (params?: {
    status?: string;
    search?: string;
    is_bookable?: boolean;
    category_id?: string;
    department_id?: string;
  }) => request<Asset[]>("/assets", { params }),

  get: (id: string) => request<Asset>(`/assets/${id}`),

  history: (id: string) =>
    request<AssetHistoryEntry[]>(`/assets/${id}/history`),

  create: (payload: AssetPayload) =>
    request<Asset>("/assets", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<AssetPayload>) =>
    request<Asset>(`/assets/${id}`, { method: "PUT", body: payload }),

  setStatus: (id: string, status: string) =>
    request<Asset>(`/assets/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  remove: (id: string) =>
    request<null>(`/assets/${id}`, { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────
// 04 – Allocations
// ─────────────────────────────────────────────────────────────────
export const allocations = {
  list: (params?: { is_active?: boolean; overdue?: boolean }) =>
    request<Allocation[]>("/allocations", { params }),

  get: (id: string) => request<Allocation>(`/allocations/${id}`),

  create: (payload: AllocationPayload) =>
    request<Allocation>("/allocations", { method: "POST", body: payload }),

  return: (id: string, payload: ReturnPayload) =>
    request<Allocation>(`/allocations/${id}/return`, {
      method: "POST",
      body: payload,
    }),

  // Transfers
  listTransfers: (params?: { status?: string }) =>
    request<Transfer[]>("/allocations/transfers", { params }),

  requestTransfer: (payload: TransferPayload) =>
    request<Transfer>("/allocations/transfers", {
      method: "POST",
      body: payload,
    }),

  approveTransfer: (id: string) =>
    request<Transfer>(`/allocations/transfers/${id}/approve`, {
      method: "PATCH",
    }),

  rejectTransfer: (id: string, rejection_note: string) =>
    request<Transfer>(`/allocations/transfers/${id}/reject`, {
      method: "PATCH",
      body: { rejection_note },
    }),
};

// ─────────────────────────────────────────────────────────────────
// 05 – Bookings
// ─────────────────────────────────────────────────────────────────
export const bookings = {
  list: (params?: { booked_by?: string; status?: string }) =>
    request<Booking[]>("/bookings", { params }),

  get: (id: string) => request<Booking>(`/bookings/${id}`),

  calendar: (assetId: string) =>
    request<Booking[]>(`/bookings/asset/${assetId}/calendar`),

  create: (payload: BookingPayload) =>
    request<Booking>("/bookings", { method: "POST", body: payload }),

  update: (id: string, payload: Partial<BookingPayload>) =>
    request<Booking>(`/bookings/${id}`, { method: "PUT", body: payload }),

  cancel: (id: string, cancel_reason: string) =>
    request<Booking>(`/bookings/${id}/cancel`, {
      method: "PATCH",
      body: { cancel_reason },
    }),
};

// ─────────────────────────────────────────────────────────────────
// 06 – Maintenance
// ─────────────────────────────────────────────────────────────────
export const maintenance = {
  list: (params?: { status?: string; priority?: string }) =>
    request<MaintenanceRequest[]>("/maintenance", { params }),

  get: (id: string) => request<MaintenanceRequest>(`/maintenance/${id}`),

  create: (payload: MaintenancePayload) =>
    request<MaintenanceRequest>("/maintenance", {
      method: "POST",
      body: payload,
    }),

  approve: (id: string) =>
    request<MaintenanceRequest>(`/maintenance/${id}/approve`, {
      method: "PATCH",
    }),

  reject: (id: string, rejection_note: string) =>
    request<MaintenanceRequest>(`/maintenance/${id}/reject`, {
      method: "PATCH",
      body: { rejection_note },
    }),

  assign: (id: string, assigned_to: string) =>
    request<MaintenanceRequest>(`/maintenance/${id}/assign`, {
      method: "PATCH",
      body: { assigned_to },
    }),

  start: (id: string) =>
    request<MaintenanceRequest>(`/maintenance/${id}/start`, {
      method: "PATCH",
    }),

  resolve: (id: string, resolution_note: string) =>
    request<MaintenanceRequest>(`/maintenance/${id}/resolve`, {
      method: "PATCH",
      body: { resolution_note },
    }),
};

// ─────────────────────────────────────────────────────────────────
// 07 – Audits
// ─────────────────────────────────────────────────────────────────
export const audits = {
  list: (params?: { status?: string }) =>
    request<AuditCycle[]>("/audits", { params }),

  get: (id: string) => request<AuditCycle>(`/audits/${id}`),

  discrepancies: (id: string) =>
    request<AuditItem[]>(`/audits/${id}/discrepancies`),

  create: (payload: AuditCyclePayload) =>
    request<AuditCycle>("/audits", { method: "POST", body: payload }),

  addAuditor: (id: string, user_id: string) =>
    request<AuditCycle>(`/audits/${id}/auditors`, {
      method: "POST",
      body: { user_id },
    }),

  removeAuditor: (id: string, userId: string) =>
    request<AuditCycle>(`/audits/${id}/auditors/${userId}`, {
      method: "DELETE",
    }),

  addItem: (id: string, asset_id: string, expected_location?: string) =>
    request<AuditItem>(`/audits/${id}/items`, {
      method: "POST",
      body: { asset_id, expected_location },
    }),

  verifyItem: (
    cycleId: string,
    itemId: string,
    verification: string,
    notes?: string
  ) =>
    request<AuditItem>(`/audits/${cycleId}/items/${itemId}/verify`, {
      method: "PATCH",
      body: { verification, notes },
    }),

  close: (id: string) =>
    request<AuditCycle>(`/audits/${id}/close`, { method: "POST" }),
};

// ─────────────────────────────────────────────────────────────────
// 08 – Dashboard
// ─────────────────────────────────────────────────────────────────
export const dashboard = {
  kpis: () => request<DashboardKPIs>("/dashboard/kpis"),

  recentActivity: (limit = 10) =>
    request<ActivityItem[]>("/dashboard/recent-activity", {
      params: { limit },
    }),

  overdueAllocations: () =>
    request<Allocation[]>("/dashboard/overdue-allocations"),
};

// ─────────────────────────────────────────────────────────────────
// 09 – Reports
// ─────────────────────────────────────────────────────────────────
export const reports = {
  utilization: () => request<UtilizationDept[]>("/reports/utilization"),

  mostUsed: () => request<MostUsedAsset[]>("/reports/most-used"),

  idle: (days = 30) =>
    request<IdleAsset[]>("/reports/idle", { params: { days } }),

  maintenanceFrequency: () =>
    request<MaintenanceFrequency[]>("/reports/maintenance-frequency"),

  dueAttention: () => request<Asset[]>("/reports/due-attention"),

  bookingHeatmap: (asset_id?: string) =>
    request<{ heatmap: number[][] }>("/reports/booking-heatmap", {
      params: { asset_id },
    }),

  deptAllocation: () =>
    request<DeptAllocationSummary[]>("/reports/dept-allocation"),

  export: () => request<{ url: string }>("/reports/export"),
};

// ─────────────────────────────────────────────────────────────────
// 10 – Notifications & Activity Logs
// ─────────────────────────────────────────────────────────────────
export const notifications = {
  list: (params?: { is_read?: boolean; type?: string }) =>
    request<Notification[]>("/notifications", { params }),

  markRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () =>
    request<null>("/notifications/read-all", { method: "PATCH" }),

  remove: (id: string) =>
    request<null>(`/notifications/${id}`, { method: "DELETE" }),
};

export const activityLogs = {
  list: (params?: { entity_type?: string }) =>
    request<ActivityItem[]>("/activity-logs", { params }),

  forEntity: (entity_type: string, entity_id: string) =>
    request<ActivityItem[]>(`/activity-logs/entity/${entity_type}/${entity_id}`),
};
