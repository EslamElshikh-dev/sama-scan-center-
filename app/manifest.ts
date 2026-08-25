import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مركز سما سكان للأشعة",
    short_name: "سما سكان",
    description: "مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض.",
    start_url: "/",
    display: "standalone",
    background_color: "#f0f4f4",
    theme_color: "#4fadd4",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/sama-scan-icon.png", sizes: "512x512", type: "image/png" }],
  };
}
