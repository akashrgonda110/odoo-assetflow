"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth-context";
import { useToast } from "./ui/Toast";

export type NavScreen =
  | "dashboard"
  | "org"
  | "assets"
  | "allocation"
  | "booking"
  | "maintenance"
  | "audit"
  | "reports"
  | "notifications";

interface NavItem {
  screen: NavScreen;
  label: string;
  /** Roles that can see this item – undefined = everyone */
  roles?: string[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { screen: "dashboard",     label: "Dashboard"             },
  { screen: "org",           label: "Organization Setup",   roles: ["admin"] },
  { screen: "assets",        label: "Assets"                },
  { screen: "allocation",    label: "Allocation & Transfer" },
  { screen: "booking",       label: "Resource Booking"      },
  { screen: "maintenance",   label: "Maintenance"           },
  { screen: "audit",         label: "Audit"                 },
  { screen: "reports",       label: "Reports"               },
  { screen: "notifications", label: "Notifications"         },
];

interface AppShellProps {
  current: NavScreen;
  onNav: (s: NavScreen) => void;
  children: ReactNode;
  unreadCount?: number;
}

export function AppShell({
  current,
  onNav,
  children,
  unreadCount = 0,
}: AppShellProps) {
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    toast("Signed out successfully");
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="sidebar animate-slide-left">
          <div className="sidebar-logo">
            <span style={{ letterSpacing: "-0.5px" }}>AssetFlow</span>
          </div>

          <nav className="sidebar-nav" aria-label="Main navigation">
            {visibleItems.map((item) => (
              <button
                key={item.screen}
                className={`sidebar-link${current === item.screen ? " active" : ""}`}
                onClick={() => onNav(item.screen)}
                aria-current={current === item.screen ? "page" : undefined}
              >
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {item.screen === "notifications" && unreadCount > 0 && (
                  <span
                    style={{
                      background: "var(--danger)",
                      color: "#fff",
                      borderRadius: "99px",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* User info + logout */}
          <div
            style={{
              padding: "14px 20px",
              borderTop: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--text-primary)" }}>
              {user?.name ?? "—"}
            </div>
            <div style={{ color: "var(--text-muted)", marginBottom: 10, fontSize: 11.5 }}>
              {user?.role?.replace(/_/g, " ")}
              {user?.department_name && ` · ${user.department_name}`}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ padding: "4px 0", width: "100%", textAlign: "left" }}
              onClick={handleLogout}
            >
              Sign out →
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="main-content" id="main-content" tabIndex={-1}>
        {/* Mobile / collapse toggle */}
        <button
          className="btn btn-ghost btn-sm"
          style={{
            position: "absolute",
            top: 10,
            left: sidebarOpen ? "calc(var(--sidebar-w) + 8px)" : 8,
            zIndex: 50,
            display: "none", // shown via CSS on mobile
          }}
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          ☰
        </button>
        {children}
      </main>
    </div>
  );
}
