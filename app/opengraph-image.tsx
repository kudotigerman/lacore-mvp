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
          fontFamily: "system-ui, sans-serif"
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
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: 800
          }}
        >
          You say what you sell.
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#6366F1", textAlign: "center", lineHeight: 1.1 }}>
          LACORE does the rest.
        </div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", marginTop: 24 }}>
          From offer to first client — in 60 minutes.
        </div>
      </div>
    ),
    { ...size }
  );
}
