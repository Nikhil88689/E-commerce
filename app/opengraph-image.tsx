import { ImageResponse } from "next/og";

export const alt = "VANTA / The Future of Commerce";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "64px 72px",
      color: "#eeeae1",
      background: "#11110f",
      fontFamily: "Arial, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", right: -90, top: -250, width: 650, height: 650, borderRadius: 400, border: "1px solid #45423a", display: "flex" }} />
      <div style={{ position: "absolute", right: -30, top: -190, width: 530, height: 530, borderRadius: 400, border: "1px solid #302f2a", display: "flex" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 17, letterSpacing: "0.24em", color: "#c7b391" }}>
        <span>V / VANTA</span><span style={{ fontSize: 12, color: "#929087" }}>OBJECTS / IDEAS / THE SPACE BETWEEN</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ fontSize: 162, lineHeight: 0.88, letterSpacing: "-0.09em", fontWeight: 500 }}>VANTA</div>
        <div style={{ marginTop: 30, fontSize: 20, letterSpacing: "0.2em", color: "#bdbab1" }}>THE FUTURE OF COMMERCE</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid #45423a", paddingTop: 20, color: "#a7a398", fontSize: 12, letterSpacing: "0.16em" }}>
        <span>FORM / MATERIAL / FUNCTION</span><span>VANTA.STUDIO</span>
      </div>
    </div>,
    { ...size },
  );
}
