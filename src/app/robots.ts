import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Almost everything in ClubSync is private student/school data behind a login,
// so only the marketing/auth pages are worth letting search engines crawl.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/welcome", "/login", "/signup", "/forgot-password"],
      disallow: [
        "/home",
        "/discover",
        "/calendar",
        "/my-clubs",
        "/my-events",
        "/service-hours",
        "/notifications",
        "/settings",
        "/clubs/",
        "/events/",
        "/director/",
        "/admin/",
        "/onboarding",
        "/access-denied",
        "/suspended",
        "/api/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
