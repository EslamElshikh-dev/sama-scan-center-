export type TrafficChannel =
  | "google_business_profile"
  | "google_ads"
  | "google_organic"
  | "social"
  | "referral"
  | "campaign"
  | "direct";

export type SessionAttribution = {
  channel: TrafficChannel;
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landingPage: string;
  referrerHost: string;
  capturedAt: number;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = "sama_scan_session_attribution_v1";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const GOOGLE_HOST_PATTERN = /(^|\.)google\./i;
const SOCIAL_HOST_PATTERN =
  /(^|\.)(instagram\.com|tiktok\.com|snapchat\.com|x\.com|twitter\.com|facebook\.com|linkedin\.com)$/i;
const SOCIAL_SOURCE_PATTERN =
  /^(instagram|tiktok|snapchat|x|twitter|facebook|linkedin)$/i;
const ATTRIBUTION_QUERY_PARAMETERS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "gclid",
  "gbraid",
  "wbraid",
  "gad_source",
  "gad_campaignid",
  "srsltid",
] as const;

function normalize(value: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function safeHost(value: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function hasCampaignParameters(params: URLSearchParams) {
  return ATTRIBUTION_QUERY_PARAMETERS.some((name) => params.has(name));
}

function classifyTraffic({
  source,
  medium,
  campaign,
  referrerHost,
  hasGoogleClickId,
}: {
  source: string;
  medium: string;
  campaign: string;
  referrerHost: string;
  hasGoogleClickId: boolean;
}): TrafficChannel {
  const isGoogle = source === "google" || GOOGLE_HOST_PATTERN.test(referrerHost);
  const isBusinessProfile =
    isGoogle &&
    (/gbp|business[_ -]?profile|google[_ -]?business|maps|local/i.test(campaign) ||
      /gbp|maps|local/i.test(medium));
  const isPaidGoogle =
    isGoogle &&
    (hasGoogleClickId || /cpc|ppc|paid|paidsearch/i.test(medium));

  if (isBusinessProfile) return "google_business_profile";
  if (isPaidGoogle) return "google_ads";
  if (isGoogle) return "google_organic";
  if (
    SOCIAL_SOURCE_PATTERN.test(source) ||
    SOCIAL_HOST_PATTERN.test(source) ||
    SOCIAL_HOST_PATTERN.test(referrerHost)
  ) {
    return "social";
  }
  if (medium || campaign || (source !== "direct" && source !== referrerHost)) {
    return "campaign";
  }
  if (referrerHost) return "referral";
  return "direct";
}

function createAttribution(): SessionAttribution {
  const params = new URLSearchParams(window.location.search);
  const referrerHost = safeHost(document.referrer);
  const isInternalReferrer = referrerHost === window.location.hostname.toLowerCase();
  const externalReferrerHost = isInternalReferrer ? "" : referrerHost;
  const explicitSource = normalize(params.get("utm_source"));
  const source = explicitSource || externalReferrerHost || "direct";
  const medium = normalize(params.get("utm_medium")) ||
    (GOOGLE_HOST_PATTERN.test(externalReferrerHost) ? "organic" : "");
  const campaign = normalize(params.get("utm_campaign"));
  const content = normalize(params.get("utm_content"));
  const hasGoogleClickId = [
    "gclid",
    "gbraid",
    "wbraid",
    "gad_source",
    "gad_campaignid",
  ].some((name) => params.has(name));

  return {
    channel: classifyTraffic({
      source,
      medium,
      campaign,
      referrerHost: externalReferrerHost,
      hasGoogleClickId,
    }),
    source,
    medium,
    campaign,
    content,
    landingPage: window.location.pathname,
    referrerHost: externalReferrerHost,
    capturedAt: Date.now(),
  };
}

function readStoredAttribution() {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const attribution = JSON.parse(stored) as SessionAttribution;
    if (
      !attribution.capturedAt ||
      Date.now() - attribution.capturedAt > SESSION_TIMEOUT_MS
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return attribution;
  } catch {
    return null;
  }
}

function storeAttribution(attribution: SessionAttribution) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // Tracking must never interrupt navigation or contact actions.
  }
}

export function getSessionAttribution(): SessionAttribution {
  const params = new URLSearchParams(window.location.search);
  const stored = readStoredAttribution();

  if (stored && !hasCampaignParameters(params)) return stored;

  const current = createAttribution();
  storeAttribution(current);
  return current;
}

export function clearAttributionParametersFromAddressBar() {
  const url = new URL(window.location.href);
  let changed = false;

  for (const parameter of ATTRIBUTION_QUERY_PARAMETERS) {
    if (!url.searchParams.has(parameter)) continue;
    url.searchParams.delete(parameter);
    changed = true;
  }

  if (!changed) return;

  const cleanAddress = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", cleanAddress);
}

export function getAttributionLabel(attribution: SessionAttribution) {
  const labels: Record<TrafficChannel, string> = {
    google_business_profile: "ملف Google التجاري",
    google_ads: "إعلان Google",
    google_organic: "بحث Google الطبيعي",
    social: "شبكات التواصل الاجتماعي",
    referral: "موقع إلكتروني مُحيل",
    campaign: "حملة تسويقية",
    direct: "زيارة مباشرة للموقع",
  };
  return labels[attribution.channel];
}

export function getAnalyticsAttribution(attribution: SessionAttribution) {
  return {
    traffic_channel: attribution.channel,
    traffic_source: attribution.source,
    traffic_medium: attribution.medium || "none",
    traffic_campaign: attribution.campaign || "none",
    traffic_content: attribution.content || "none",
    landing_page: attribution.landingPage,
    referrer_host: attribution.referrerHost || "none",
  };
}

export function sendAnalyticsEvent(
  eventName: string,
  parameters: Record<string, unknown>,
) {
  window.dataLayer ??= [];
  if (window.gtag) {
    window.gtag("event", eventName, parameters);
    return;
  }
  window.dataLayer.push({ event: eventName, ...parameters });
}
