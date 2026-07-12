/**
 * FormField – Label + input/select/textarea + inline error message.
 * Single responsibility: visual field wrapper with error display.
 */
import type { ReactNode } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="af-label">
        {label}
        {required && (
          <span style={{ color: "var(--danger)", marginLeft: 2 }} aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          role="alert"
          style={{ margin: "4px 0 0", fontSize: 12, color: "var(--danger)", fontWeight: 500 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Convenience Inputs ─────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
export function Input({ error, className = "", ...props }: InputProps) {
  return (
    <input
      className={`af-input${error ? " af-input-error" : ""} ${className}`.trim()}
      aria-invalid={!!error}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}
export function Select({
  error,
  options,
  placeholder,
  className = "",
  ...props
}: SelectProps) {
  return (
    <select
      className={`af-input af-select${error ? " af-input-error" : ""} ${className}`.trim()}
      aria-invalid={!!error}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}
export function Textarea({ error, className = "", ...props }: TextareaProps) {
  return (
    <textarea
      className={`af-input af-textarea${error ? " af-input-error" : ""} ${className}`.trim()}
      aria-invalid={!!error}
      {...props}
    />
  );
}
