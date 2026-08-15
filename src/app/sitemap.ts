import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, priority: 1 },
    { url: `${baseUrl}/welcome`, priority: 1 },
    { url: `${baseUrl}/login`, priority: 0.5 },
    { url: `${baseUrl}/signup`, priority: 0.5 },
  ];
}
