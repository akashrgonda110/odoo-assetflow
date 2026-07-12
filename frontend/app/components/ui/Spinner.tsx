interface SpinnerProps {
  size?: number;
  fullPage?: boolean;
}

export function Spinner({ size = 24, fullPage = false }: SpinnerProps) {
  const el = (
    <span
      role="status"
      aria-label="Loading"
      className="spinner"
      style={{ width: size, height: size }}
    />
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 200,
        }}
      >
        {el}
      </div>
    );
  }

  return el;
}
