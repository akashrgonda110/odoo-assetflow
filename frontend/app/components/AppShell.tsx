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

// ─── SVG Icons ───────────────────────────────────────────────────
const Icons: Record<NavScreen | "signout" | "menu", ReactNode> = {
  dashboard: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  ),
  org: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
    </svg>
  ),
  assets: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path fillRule="evenodd" d="M5 4a2 2 0 012-2h6a2 2 0 012 2v1h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2V4zm2 0v1h6V4H7zM3 7v10h14V7H3zm7 2a1 1 0 100 2 1 1 0 000-2zm-3 1a3 3 0 116 0 3 3 0 01-6 0z" clipRule="evenodd" />
    </svg>
  ),
  allocation: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
    </svg>
  ),
  booking: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="sidebar-link-icon">
      <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
    </svg>
  ),
  signout: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h5a1 1 0 110 2H3a3 3 0 01-3-3V4a3 3 0 013-3h5a1 1 0 010 2H3zm10.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 11H7a1 1 0 110-2h7.586l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 18, height: 18 }}>
      <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

interface NavItem {
  screen: NavScreen;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { screen: "dashboard",     label: "Dashboard"             },
  { screen: "org",           label: "Organization",         roles: ["admin"] },
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
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  async function handleLogout() {
    await logout();
    toast("Signed out successfully");
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  return (
    <div className="app-shell">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {sidebarOpen && (
        <aside className="sidebar animate-slide-left">
          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">AF</div>
            <span>AssetFlow</span>
          </div>

          {/* Nav */}
          <nav className="sidebar-nav" aria-label="Main navigation">
            <div className="sidebar-section-label">Main Menu</div>
            {visibleItems.map((item) => (
              <button
                key={item.screen}
                className={`sidebar-link${current === item.screen ? " active" : ""}`}
                onClick={() => onNav(item.screen)}
                aria-current={current === item.screen ? "page" : undefined}
              >
                {Icons[item.screen]}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.screen === "notifications" && unreadCount > 0 && (
                  <span
                    style={{
                      background: "#dc2626",
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
          <div className="sidebar-user">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sidebar-user-name">{user?.name ?? "—"}</div>
                <div className="sidebar-user-role">
                  {user?.role?.replace(/_/g, " ")}
                  {user?.department_name && ` · ${user.department_name}`}
                </div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{
                width: "100%",
                justifyContent: "flex-start",
                color: "#64748b",
                fontSize: 12.5,
                padding: "6px 4px",
                gap: 6,
              }}
              onClick={handleLogout}
            >
              {Icons.signout}
              Sign out
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="main-content" id="main-content" tabIndex={-1}>
        {/* Sidebar toggle */}
        <button
          className="btn btn-ghost btn-sm"
          style={{
            position: "fixed",
            top: 12,
            left: sidebarOpen ? "calc(var(--sidebar-w) + 8px)" : 12,
            zIndex: 50,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
          aria-label="Toggle sidebar"
          onClick={() => setSidebarOpen((v) => !v)}
        >
          {Icons.menu}
        </button>
        <div style={{ marginTop: sidebarOpen ? 0 : 40 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
