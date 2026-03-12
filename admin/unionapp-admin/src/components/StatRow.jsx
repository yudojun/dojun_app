function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function StatRow({ label, value, percent }) {
  const w = clamp(percent, 0, 100);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 90px",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ fontWeight: 700 }}>{label}</div>

      <div
        style={{
          background: "#eee",
          borderRadius: 8,
          height: 14,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${w}%`,
            height: "100%",
            background: "#2d8cff",
          }}
        />
      </div>

      <div style={{ textAlign: "right", color: "#444" }}>
        {value} ({w}%)
      </div>
    </div>
  );
}