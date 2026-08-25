import { ImageResponse } from "next/og";

export const alt = "Sama Scan Radiology Center in Riyadh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "82px 90px",
          color: "white",
          background:
            "linear-gradient(135deg, #061725 0%, #19516b 58%, #4fadd4 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 710 }}>
          <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: -2 }}>
            SAMA SCAN
          </div>
          <div
            style={{
              marginTop: 10,
              color: "#9cdcea",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 7,
            }}
          >
            RADIOLOGY CENTER · RIYADH
          </div>
          <div style={{ width: 490, height: 2, marginTop: 50, background: "#9cdcea" }} />
          <div style={{ marginTop: 36, color: "#d4e8ed", fontSize: 30 }}>
            MRI · Ultrasound · Doppler · 3D &amp; 4D
          </div>
          <div style={{ marginTop: 54, color: "#9dc0c9", fontSize: 24 }}>
            Al Murabba · Riyadh, Saudi Arabia
          </div>
        </div>
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 330,
            height: 330,
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(6, 23, 37, .55)",
            border: "3px solid #9cdcea",
            borderRadius: "50%",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 210,
              height: 210,
              alignItems: "center",
              justifyContent: "center",
              border: "2px dashed rgba(156, 220, 234, .62)",
              borderRadius: "50%",
            }}
          >
            <div
              style={{
                display: "flex",
                width: 112,
                height: 112,
                alignItems: "center",
                justifyContent: "center",
                color: "#f0f4f4",
                background: "#287a9e",
                border: "3px solid #9cdcea",
                borderRadius: "50%",
                fontSize: 58,
                fontWeight: 800,
              }}
            >
              S
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
