import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080F",
          fontFamily: "system-ui, sans-serif",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="7" height="17" rx="1.5" fill="#6366F1" />
            <rect x="2" y="17" width="15" height="5" rx="1.5" fill="#6366F1" />
            <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#818CF8" opacity="0.65" />
          </svg>
          <span style={{ fontSize: 40, fontWeight: 700, color: "#fff", letterSpacing: "0.08em" }}>LACORE</span>
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", textAlign: "center", lineHeight: 1.05, maxWidth: 860 }}>
          Your entire sales team.
        </div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#6366F1", textAlign: "center", lineHeight: 1.05, marginBottom: 28 }}>
          In one tab.
        </div>
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", textAlign: "center", maxWidth: 640 }}>
          Prospects · Landing pages · Proposals · Sequences · Payments
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #6366F1, #818CF8, #6366F1)"
          }}
        />
      </div>
    ),
    { ...size }
  );
}
