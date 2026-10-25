import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#059669" }}>
        <svg width="120" height="120" viewBox="0 0 24 24">
          <path
            d="M9 17.5V6.5h4a3.25 3.25 0 0 1 0 6.5H9"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
