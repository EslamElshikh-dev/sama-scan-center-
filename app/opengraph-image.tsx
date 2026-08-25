import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Sama Scan Radiology Center in Riyadh";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoBuffer = await readFile(join(process.cwd(), "public", "sama-scan-icon.png"));
  const logoDataUrl = `data:image/png;base64,${logoBuffer.toString("base64")}`;

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
            background: "rgba(6, 23, 37, .48)",
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
              background: "rgba(240, 244, 244, .07)",
              border: "2px dashed rgba(156, 220, 234, .66)",
              borderRadius: "50%",
            }}
          >
            {/* ImageResponse renders this embedded asset into the generated social image. */}
            <img
              src={logoDataUrl}
              alt=""
              width={190}
              height={190}
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>
    ),
    size,
  );
}
