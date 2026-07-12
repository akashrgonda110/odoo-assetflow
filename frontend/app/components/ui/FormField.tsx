/**
 * FormField – Label + input/select/textarea + inline error message.
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
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && (
          <span className="required-star" aria-hidden="true">*</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && (
        <p role="alert" className="form-error">{error}</p>
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
      className={`form-input${error ? " af-input-error" : ""} ${className}`.trim()}
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
      className={`form-select${error ? " af-input-error" : ""} ${className}`.trim()}
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
      className={`form-textarea${error ? " af-input-error" : ""} ${className}`.trim()}
      aria-invalid={!!error}
      {...props}
    />
  );
}
