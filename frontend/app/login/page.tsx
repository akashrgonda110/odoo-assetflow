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

  // Login form
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Partial<LoginForm>>({});

  // Register form
  const [regForm, setRegForm] = useState<RegisterForm>({
    name: "",
    email: "",
    password: "",
  });
  const [regErrors, setRegErrors] = useState<Partial<RegisterForm>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [user, loading, router]);

  // ─── Handlers ───────────────────────────────────────────────────
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
      const msg =
        err instanceof ApiError
          ? err.message
          : "Login failed. Please try again.";
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
      const msg =
        err instanceof ApiError ? err.message : "Registration failed.";
      toast(msg, "error");
    } finally {
      setSubmit(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 16px",
      }}
    >
      <div
        className="card animate-scale-in"
        style={{ width: "100%", maxWidth: 380, padding: "36px 32px" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            aria-hidden="true"
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "var(--accent-light)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--accent-hover)",
            }}
          >
            AF
          </div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
            AssetFlow — {mode === "login" ? "Sign In" : "Create Account"}
          </h1>
        </div>

        {/* ── LOGIN FORM ────────────────────────────────────────── */}
        {mode === "login" && (
          <form onSubmit={handleLogin} noValidate>
            <FormField label="Email" error={loginErrors.email} required>
              <Input
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={loginForm.email}
                error={loginErrors.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
              />
            </FormField>

            <FormField label="Password" error={loginErrors.password} required>
              <Input
                type="password"
                placeholder="••••••••••"
                autoComplete="current-password"
                value={loginForm.password}
                error={loginErrors.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
              />
            </FormField>

            <div style={{ textAlign: "right", marginBottom: 20, marginTop: -8 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12.5, padding: "2px 0" }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : "Sign In"}
            </button>
          </form>
        )}

        {/* ── REGISTER FORM ─────────────────────────────────────── */}
        {mode === "register" && (
          <form onSubmit={handleRegister} noValidate>
            <FormField label="Full Name" error={regErrors.name} required>
              <Input
                type="text"
                placeholder="Priya Shah"
                autoComplete="name"
                value={regForm.name}
                error={regErrors.name}
                onChange={(e) =>
                  setRegForm({ ...regForm, name: e.target.value })
                }
              />
            </FormField>

            <FormField label="Email" error={regErrors.email} required>
              <Input
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                value={regForm.email}
                error={regErrors.email}
                onChange={(e) =>
                  setRegForm({ ...regForm, email: e.target.value })
                }
              />
            </FormField>

            <FormField
              label="Password"
              error={regErrors.password}
              required
              hint="Min 8 chars, one uppercase, one number."
            >
              <Input
                type="password"
                placeholder="••••••••••"
                autoComplete="new-password"
                value={regForm.password}
                error={regErrors.password}
                onChange={(e) =>
                  setRegForm({ ...regForm, password: e.target.value })
                }
              />
            </FormField>

            <div
              style={{
                background: "var(--bg)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12.5,
                color: "var(--text-secondary)",
                marginBottom: 16,
                border: "1px solid var(--border)",
              }}
            >
              Sign up creates an <strong>Employee</strong> account. Admin
              assigns roles (Manager / Dept Head) later via Organization Setup.
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={submitting}
            >
              {submitting ? <span className="spinner" /> : "Create Account"}
            </button>
          </form>
        )}

        {/* ── Toggle ────────────────────────────────────────────── */}
        <hr className="divider" style={{ margin: "20px 0 16px" }} />
        <p style={{ margin: 0, fontSize: 13, textAlign: "center", color: "var(--text-secondary)" }}>
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 13, fontWeight: 600, padding: "0 2px" }}
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create Account" : "Sign In"}
          </button>
        </p>

        {/* Demo hint */}
        {mode === "login" && (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 11.5,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Demo: admin@assetflow.com / Admin@1234
          </p>
        )}
      </div>
    </div>
  );
}
