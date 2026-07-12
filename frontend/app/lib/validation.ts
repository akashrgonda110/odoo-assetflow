/**
 * AssetFlow – Form Validation Helpers
 * Pure functions, no dependencies. Return error strings or undefined.
 */

export type FieldError = string | undefined;
export type FormErrors<T> = Partial<Record<keyof T, string>>;

// ─── Primitives ────────────────────────────────────────────────────
export function required(value: unknown, label = "This field"): FieldError {
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${label} is required.`;
  }
}

export function minLength(value: string, min: number, label = "This field"): FieldError {
  if (value.trim().length < min) {
    return `${label} must be at least ${min} characters.`;
  }
}

export function maxLength(value: string, max: number, label = "This field"): FieldError {
  if (value.trim().length > max) {
    return `${label} must be ${max} characters or fewer.`;
  }
}

export function isEmail(value: string): FieldError {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value.trim())) return "Enter a valid email address.";
}

export function isStrongPassword(value: string): FieldError {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password must contain an uppercase letter.";
  if (!/[0-9]/.test(value)) return "Password must contain a number.";
}

export function isPositiveNumber(value: string | number, label = "Value"): FieldError {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n) || n < 0) return `${label} must be a positive number.`;
}

export function isDate(value: string, label = "Date"): FieldError {
  if (!value) return;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${label} must be a valid date.`;
}

export function isDateAfter(startIso: string, endIso: string): FieldError {
  const s = new Date(startIso).getTime();
  const e = new Date(endIso).getTime();
  if (s >= e) return "End date/time must be after start.";
}

// ─── Domain-specific validators ────────────────────────────────────
export interface LoginForm {
  email: string;
  password: string;
}
export function validateLogin(f: LoginForm): FormErrors<LoginForm> {
  const errors: FormErrors<LoginForm> = {};
  errors.email    = required(f.email, "Email") ?? isEmail(f.email);
  errors.password = required(f.password, "Password");
  return errors;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
}
export function validateRegister(f: RegisterForm): FormErrors<RegisterForm> {
  const errors: FormErrors<RegisterForm> = {};
  errors.name     = required(f.name, "Name") ?? minLength(f.name, 2, "Name");
  errors.email    = required(f.email, "Email") ?? isEmail(f.email);
  errors.password = required(f.password, "Password") ?? isStrongPassword(f.password);
  return errors;
}

export interface AssetForm {
  name: string;
  category_id: string;
  condition: string;
  location: string;
  acquisition_cost: string;
  serial_number: string;
}
export function validateAsset(f: AssetForm): FormErrors<AssetForm> {
  const errors: FormErrors<AssetForm> = {};
  errors.name        = required(f.name, "Asset name") ?? minLength(f.name, 2, "Asset name");
  errors.category_id = required(f.category_id, "Category");
  errors.condition   = required(f.condition, "Condition");
  errors.location    = required(f.location, "Location");
  if (f.acquisition_cost) {
    errors.acquisition_cost = isPositiveNumber(f.acquisition_cost, "Acquisition cost");
  }
  return errors;
}

export interface BookingForm {
  asset_id: string;
  title: string;
  start_time: string;
  end_time: string;
}
export function validateBooking(f: BookingForm): FormErrors<BookingForm> {
  const errors: FormErrors<BookingForm> = {};
  errors.asset_id   = required(f.asset_id, "Resource");
  errors.title      = required(f.title, "Title") ?? minLength(f.title, 3, "Title");
  errors.start_time = required(f.start_time, "Start time");
  errors.end_time   = required(f.end_time, "End time");
  if (f.start_time && f.end_time) {
    errors.end_time = isDateAfter(f.start_time, f.end_time);
  }
  return errors;
}

export interface MaintenanceForm {
  asset_id: string;
  issue_desc: string;
  priority: string;
}
export function validateMaintenance(f: MaintenanceForm): FormErrors<MaintenanceForm> {
  const errors: FormErrors<MaintenanceForm> = {};
  errors.asset_id   = required(f.asset_id, "Asset");
  errors.issue_desc = required(f.issue_desc, "Issue description") ?? minLength(f.issue_desc, 10, "Issue description");
  errors.priority   = required(f.priority, "Priority");
  return errors;
}

export interface AuditForm {
  title: string;
  start_date: string;
  end_date: string;
}
export function validateAudit(f: AuditForm): FormErrors<AuditForm> {
  const errors: FormErrors<AuditForm> = {};
  errors.title      = required(f.title, "Title") ?? minLength(f.title, 3, "Title");
  errors.start_date = required(f.start_date, "Start date") ?? isDate(f.start_date, "Start date");
  errors.end_date   = required(f.end_date, "End date") ?? isDate(f.end_date, "End date");
  if (f.start_date && f.end_date) {
    errors.end_date = isDateAfter(f.start_date, f.end_date);
  }
  return errors;
}

export interface TransferForm {
  to_user_id: string;
  to_dept_id: string;
  reason: string;
}
export function validateTransfer(f: TransferForm, mode: "employee" | "dept" = "employee"): FormErrors<TransferForm> {
  const errors: FormErrors<TransferForm> = {};
  if (mode === "employee") {
    errors.to_user_id = required(f.to_user_id, "Recipient employee");
  } else {
    errors.to_dept_id = required(f.to_dept_id, "Recipient department");
  }
  errors.reason = required(f.reason, "Reason") ?? minLength(f.reason, 10, "Reason");
  return errors;
}

// ─── Utility: check if form has any errors ─────────────────────────
export function hasErrors<T>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
