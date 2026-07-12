"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./lib/auth-context";
import { AppShell, type NavScreen } from "./components/AppShell";
import { Spinner } from "./components/ui/Spinner";
import { useState } from "react";

// ─── Lazy-imported screen components ──────────────────────────────
import { DashboardScreen }    from "./screens/DashboardScreen";
import { OrgScreen }          from "./screens/OrgScreen";
import { AssetsScreen }       from "./screens/AssetsScreen";
import { AllocationScreen }   from "./screens/AllocationScreen";
import { BookingScreen }      from "./screens/BookingScreen";
import { MaintenanceScreen }  from "./screens/MaintenanceScreen";
import { AuditScreen }        from "./screens/AuditScreen";
import { ReportsScreen }      from "./screens/ReportsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [screen, setScreen] = useState<NavScreen>("dashboard");
  const [unreadCount, setUnreadCount] = useState(2);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return <Spinner fullPage />;
  }

  function renderScreen() {
    switch (screen) {
      case "dashboard":     return <DashboardScreen    onNav={setScreen} />;
      case "org":           return <OrgScreen          />;
      case "assets":        return <AssetsScreen       />;
      case "allocation":    return <AllocationScreen   />;
      case "booking":       return <BookingScreen      />;
      case "maintenance":   return <MaintenanceScreen  />;
      case "audit":         return <AuditScreen        />;
      case "reports":       return <ReportsScreen      />;
      case "notifications": return <NotificationsScreen onUnreadChange={setUnreadCount} />;
      default:              return <DashboardScreen    onNav={setScreen} />;
    }
  }

  return (
    <AppShell current={screen} onNav={setScreen} unreadCount={unreadCount}>
      {renderScreen()}
    </AppShell>
  );
}
