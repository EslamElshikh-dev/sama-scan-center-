import type { MetadataRoute } from "next";
import { blogPosts } from "@/lib/blog";
import { services, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/services", "/blog", "/about", "/location", "/contact", "/privacy"];
  const servicePages = services.map((service) => `/services/${service.slug}`);
  const articlePages = blogPosts.map((post) => `/blog/${post.slug}`);

  return [...staticPages, ...servicePages, ...articlePages].map((path) => ({
    url: `${site.siteUrl}${path}`,
    lastModified: new Date(path.startsWith("/blog") ? "2026-08-30T00:00:00+03:00" : "2026-08-26T00:00:00+03:00"),
    changeFrequency: path === "" || path === "/blog" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/services" || path === "/blog" ? 0.9 : path.startsWith("/blog/") ? 0.8 : 0.8,
  }));
}
