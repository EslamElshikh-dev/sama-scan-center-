import type { MetadataRoute } from "next";
import { services, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/services", "/about", "/location", "/contact", "/privacy"];
  const servicePages = services.map((service) => `/services/${service.slug}`);

  return [...staticPages, ...servicePages].map((path) => ({
    url: `${site.siteUrl}${path}`,
    lastModified: new Date("2026-08-26T00:00:00+03:00"),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/services" ? 0.9 : 0.8,
  }));
}
