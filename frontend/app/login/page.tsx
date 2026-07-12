"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { useToast } from "../components/ui/Toast";
import { FormField, Input } from "../components/ui/FormField";
import {
  validateLogin,
  validateRegister,
  hasErrors,
  type LoginForm,
  type RegisterForm,
} from "../lib/validation";
import { ApiError } from "../lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [mode, setMode]         = useState<Mode>("login");
  const [submitting, setSubmit] = useState(false);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState<Partial<LoginForm>>({});

  const [regForm, setRegForm] = useState<RegisterForm>({ name: "", email: "", password: "" });
  const [regErrors, setRegErrors] = useState<Partial<RegisterForm>>({});

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    if (hasErrors(errors)) return;
    setSubmit(true);
    try {
      await login(loginForm);
      toast("Welcome back!");
      router.replace("/");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast(msg, "error");
    } finally {
      setSubmit(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateRegister(regForm);
    setRegErrors(errors);
    if (hasErrors(errors)) return;
    setSubmit(true);
    try {
      await register(regForm);
      toast("Account created! Admin will assign your role.");
      router.replace("/");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed.";
      toast(msg, "error");
    } finally {
      setSubmit(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--bg)",
      }}
    >
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          background: "var(--navy)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 56px",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-left-panel"
      >
        {/* Decorative circle */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 320, height: 320, borderRadius: "50%",
          background: "rgba(79,70,229,0.15)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -60, left: -40,
          width: 220, height: 220, borderRadius: "50%",
          background: "rgba(79,70,229,0.1)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "var(--primary)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 800, color: "#fff",
          }}>
            AF
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
            AssetFlow
          </span>
        </div>

        <h2 style={{
          fontSize: 30, fontWeight: 800, color: "#fff",
          lineHeight: 1.25, marginBottom: 16, letterSpacing: "-0.5px",
        }}>
          Enterprise Asset<br />Management
        </h2>
        <p style={{ fontSize: 15, color: "#94a3b8", lineHeight: 1.65, maxWidth: 380 }}>
          Track, allocate, and maintain physical assets and shared resources across your entire organization — from laptops to vehicles.
        </p>

        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "📦", text: "Unified asset registry with full lifecycle tracking" },
            { icon: "🔄", text: "Seamless allocation, transfer & booking workflows" },
            { icon: "🔧", text: "Maintenance kanban with technician assignment" },
            { icon: "📊", text: "Utilization reports and audit cycles" },
          ].map((f) => (
            <div key={f.icon} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{f.icon}</span>
              <span style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.5 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div
        style={{
          width: 420,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 40px",
          background: "var(--surface)",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.3px" }}>
            {mode === "login" ? "Sign in to AssetFlow" : "Create your account"}
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>
            {mode === "login"
              ? "Enter your credentials to continue."
              : "Sign up to request access from your admin."}
          </p>
        </div>

        {/* ── LOGIN FORM ────────────────────────────────────────── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} noValidate>
            <FormField label="Email address" error={loginErrors.email} required>
              <Input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                autoFocus
                value={loginForm.email}
                error={loginErrors.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
              />
            </FormField>

            <FormField label="Password" error={loginErrors.password} required>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={loginForm.password}
                error={loginErrors.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </FormField>

            <button
              type="submit"
              id="login-submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 14, marginTop: 4 }}
              disabled={submitting}
            >
              {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</> : "Sign in"}
            </button>

            {/* Demo credentials */}
            <div style={{
              marginTop: 20, padding: "12px 14px",
              background: "var(--primary-light)", borderRadius: 8,
              border: "1px solid #c7d2fe",
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", marginBottom: 4 }}>
                Demo credentials
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                admin@assetflow.com / Admin@1234
              </p>
            </div>
          </form>
        )}

        {/* ── REGISTER FORM ─────────────────────────────────────── */}
        {mode === "register" && (
          <form onSubmit={handleRegister} noValidate>
            <FormField label="Full name" error={regErrors.name} required>
              <Input
                id="reg-name"
                type="text"
                placeholder="Priya Shah"
                autoComplete="name"
                autoFocus
                value={regForm.name}
                error={regErrors.name}
                onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
              />
            </FormField>

            <FormField label="Email address" error={regErrors.email} required>
              <Input
                id="reg-email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={regForm.email}
                error={regErrors.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              />
            </FormField>

            <FormField
              label="Password"
              error={regErrors.password}
              required
              hint="Min 8 chars, one uppercase, one number."
            >
              <Input
                id="reg-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={regForm.password}
                error={regErrors.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
              />
            </FormField>

            <div style={{
              background: "var(--warning-light)", borderRadius: 8,
              padding: "10px 14px", fontSize: 12.5,
              color: "#78350f", marginBottom: 16,
              border: "1px solid #fcd34d",
            }}>
              Sign up creates an <strong>Employee</strong> account. Admin assigns roles later via Organization Setup.
            </div>

            <button
              type="submit"
              id="register-submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 14 }}
              disabled={submitting}
            >
              {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating…</> : "Create account"}
            </button>
          </form>
        )}

        {/* ── Toggle ────────────────────────────────────────────── */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <hr className="divider" style={{ margin: "0 0 16px" }} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", padding: "0 2px" }}
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* ── Responsive: hide left panel on small screens ─────────── */}
      <style>{`
        @media (max-width: 768px) {
          .login-left-panel { display: none; }
        }
      `}</style>
    </div>
  );
}
