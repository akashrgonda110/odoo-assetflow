"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, type }]);
  }, []);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast stack */}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {items.map((item) => (
          <ToastMessage
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastMessage({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const bgMap: Record<ToastType, string> = {
    success: "#16a34a",
    error:   "#dc2626",
    info:    "#2563eb",
    warning: "#d97706",
  };

  const iconMap: Record<ToastType, string> = {
    success: "✓",
    error:   "✕",
    info:    "ℹ",
    warning: "⚠",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 16px",
        borderRadius: 8,
        fontSize: 13.5,
        fontWeight: 500,
        color: "#fff",
        background: bgMap[item.type],
        boxShadow: "0 4px 14px rgba(0,0,0,.22)",
        animation: "fadeUp 0.3s ease both",
        pointerEvents: "all",
        cursor: "pointer",
        minWidth: 220,
        maxWidth: 360,
      }}
      role="alert"
      onClick={onDismiss}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>{iconMap[item.type]}</span>
      <span style={{ flex: 1 }}>{item.message}</span>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
