import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080F"
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="7" height="17" rx="1.5" fill="#6366F1" />
          <rect x="2" y="17" width="15" height="5" rx="1.5" fill="#6366F1" />
          <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#818CF8" opacity="0.65" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
