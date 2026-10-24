"use client";

export default function AiOrb({
  size = 56,
  status = "online",
}: {
  size?: number;
  status?: "online" | "thinking" | "listening";
}) {
  const color =
    status === "listening"
      ? "var(--accent-magenta)"
      : status === "thinking"
        ? "var(--accent-amber)"
        : "var(--accent-cyan)";

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <span
        className="pulse-ring absolute inset-0 rounded-full"
        style={{ border: `1px solid ${color}` }}
      />
      <span
        className="pulse-ring absolute inset-0 rounded-full"
        style={{ border: `1px solid ${color}`, animationDelay: "1.2s" }}
      />
      <div
        className="orb-breathe relative rounded-full"
        style={{
          width: size * 0.62,
          height: size * 0.62,
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${color} 35%, rgba(0,0,0,0) 75%)`,
          boxShadow: `0 0 ${size * 0.6}px ${color}99, 0 0 ${size * 0.15}px ${color}`,
        }}
      />
    </div>
  );
}
