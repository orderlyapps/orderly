export function MonthHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 20px 6px",
        color: "var(--ion-color-primary)",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      <span>{label}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: "color-mix(in srgb, var(--ion-color-primary) 35%, transparent)",
        }}
      />
    </div>
  );
}
