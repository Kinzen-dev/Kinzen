import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the same K mark as icon.svg, on the ink ground. */
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#14120f" }}>
      <svg width="180" height="180" viewBox="0 0 64 64">
        <path d="M21 15v34M44 15 25.5 33 44 49" fill="none" stroke="#d9ac55" strokeWidth="7" strokeLinecap="square" />
      </svg>
    </div>,
    size,
  );
}
