import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { services, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/services", "/blog", "/about", "/location", "/contact", "/privacy", "/social"];
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${site.siteUrl}${path}`,
    lastModified: new Date(path === "/blog" || path === "/services" || path === "/social" ? "2026-09-05T00:00:00+03:00" : "2026-08-26T00:00:00+03:00"),
    changeFrequency: path === "" || path === "/blog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/services" || path === "/blog" ? 0.9 : path === "/social" ? 0.85 : 0.8,
  }));

  const serviceEntries: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${site.siteUrl}/services/${service.slug}`,
    lastModified: new Date("2026-09-05T00:00:00+03:00"),
    changeFrequency: "monthly",
    priority: 0.85,
  }));

  const articleEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${site.siteUrl}/blog/${post.slug}`,
    lastModified: new Date(`${post.modified}T00:00:00+03:00`),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...serviceEntries, ...articleEntries];
}
