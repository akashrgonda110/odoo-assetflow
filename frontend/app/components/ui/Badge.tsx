import type { ReactNode } from "react";

type Variant =
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "gray"
  | "orange"
  | "teal"
  | "purple";

interface BadgeProps {
  variant: Variant;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}

// ─── Convenience helpers ───────────────────────────────────────────

const ASSET_STATUS_MAP: Record<string, Variant> = {
  available:         "green",
  allocated:         "blue",
  reserved:          "orange",
  under_maintenance: "yellow",
  lost:              "red",
  retired:           "gray",
  disposed:          "gray",
};

const DEPT_STATUS_MAP: Record<string, Variant> = {
  active:   "green",
  inactive: "gray",
};

const VERIFY_MAP: Record<string, Variant> = {
  verified: "green",
  missing:  "red",
  damaged:  "orange",
  pending:  "gray",
};

const TRANSFER_MAP: Record<string, Variant> = {
  pending:   "yellow",
  approved:  "green",
  rejected:  "red",
  cancelled: "gray",
};

const MAINT_MAP: Record<string, Variant> = {
  pending:              "yellow",
  approved:             "teal",
  rejected:             "red",
  technician_assigned:  "blue",
  in_progress:          "blue",
  resolved:             "green",
};

const BOOKING_MAP: Record<string, Variant> = {
  upcoming:  "blue",
  ongoing:   "teal",
  completed: "green",
  cancelled: "gray",
};

const PRIORITY_MAP: Record<string, Variant> = {
  low:      "gray",
  medium:   "blue",
  high:     "orange",
  critical: "red",
};

export function AssetStatusBadge({ status }: { status: string }) {
  const label = status.replace("_", " ");
  const variant = ASSET_STATUS_MAP[status] ?? "gray";
  return <Badge variant={variant}>{label}</Badge>;
}

export function DeptStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={DEPT_STATUS_MAP[status] ?? "gray"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function VerifyBadge({ status }: { status: string }) {
  return (
    <Badge variant={VERIFY_MAP[status] ?? "gray"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function TransferStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TRANSFER_MAP[status] ?? "gray"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function MaintenanceStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <Badge variant={MAINT_MAP[status] ?? "gray"}>
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </Badge>
  );
}

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={BOOKING_MAP[status] ?? "gray"}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_MAP[priority] ?? "gray"}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    admin:           "Admin",
    asset_manager:   "Asset Manager",
    department_head: "Dept Head",
    employee:        "Employee",
  };
  return <Badge variant="teal">{labels[role] ?? role}</Badge>;
}
