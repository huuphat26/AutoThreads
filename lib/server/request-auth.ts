import type { NextRequest } from "next/server";

function normalizeHost(host: string): string {
  return host.trim().toLowerCase();
}

function getOriginHost(origin: string): string | null {
  try {
    return normalizeHost(new URL(origin).host);
  } catch {
    return null;
  }
}

export function hasValidCronSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const headerSecret = req.headers.get("x-cron-secret")?.trim();
  return !!headerSecret && headerSecret === expected;
}

export function isSameOriginBrowserRequest(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;

  const originHost = getOriginHost(origin);
  if (!originHost) return false;
  if (originHost !== normalizeHost(host)) return false;

  // Restrict non-secret browser calls to same-origin/same-site navigations.
  const fetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  return fetchSite === "same-origin" || fetchSite === "same-site";
}

/**
 * Allow privileged routes when either:
 * - Request carries valid CRON secret (automation/server-to-server), or
 * - Request comes from the same-origin browser app.
 */
export function canUsePrivilegedRoute(req: NextRequest): boolean {
  return hasValidCronSecret(req) || isSameOriginBrowserRequest(req);
}
