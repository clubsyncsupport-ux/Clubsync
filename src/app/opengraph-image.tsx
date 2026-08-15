import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f766e, #0d9488)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
            height: 160,
            borderRadius: 40,
            background: "rgba(255,255,255,0.16)",
            marginBottom: 40,
          }}
        >
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="5" width="16" height="15" rx="2.5" stroke="white" strokeWidth="1.8" />
            <path d="M4 9.5h16" stroke="white" strokeWidth="1.8" />
            <path d="M8 3v3M16 3v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M8.5 14.2l2.3 2.3 4.7-4.8" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "white", letterSpacing: -1 }}>ClubSync</div>
        <div style={{ display: "flex", fontSize: 32, color: "rgba(255,255,255,0.85)", marginTop: 16 }}>
          Clubs, events, and service hours in one place
        </div>
      </div>
    ),
    { ...size }
  );
}
