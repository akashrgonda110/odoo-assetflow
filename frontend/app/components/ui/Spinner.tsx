interface SpinnerProps {
  size?: number;
  fullPage?: boolean;
  dark?: boolean;
}

export function Spinner({ size = 24, fullPage = false, dark = false }: SpinnerProps) {
  const el = (
    <span
      role="status"
      aria-label="Loading"
      className={`spinner${dark ? " spinner-dark" : ""}`}
      style={{ width: size, height: size }}
    />
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 240,
          gap: 12,
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        <span
          role="status"
          aria-label="Loading"
          className="spinner spinner-dark"
          style={{ width: size, height: size }}
        />
        Loading…
      </div>
    );
  }

  return el;
}
