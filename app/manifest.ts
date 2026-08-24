import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "مركز سما سكان للأشعة",
    short_name: "سما سكان",
    description: "مركز سما سكان للأشعة والتصوير الطبي في حي المربع بالرياض.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5fbfc",
    theme_color: "#071b2e",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
