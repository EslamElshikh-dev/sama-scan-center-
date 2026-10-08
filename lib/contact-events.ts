import type { SessionAttribution } from "@/lib/attribution";

let fallbackSession = "";
export function contactSessionId() {
  try {
    const existing = sessionStorage.getItem("samascan-contact-session-v1");
    if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem("samascan-contact-session-v1", id);
    return id;
  } catch {
    fallbackSession ||= crypto.randomUUID();
    return fallbackSession;
  }
}

export function recordContactClick(kind: "phone" | "whatsapp", cta: string, attribution: SessionAttribution) {
  const eventId = crypto.randomUUID();
  const reference = `SC-${eventId.replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const { channel, source, medium, campaign, content, landingPage, referrerHost } = attribution;
  const body = JSON.stringify({ event_id: eventId, session_id: contactSessionId(), kind,
    cta, page_path: window.location.pathname,
    attribution: { channel, source, medium, campaign, content, landingPage, referrerHost } });
  // Never delay the phone/WhatsApp action or send patient details to analytics.
  try {
    if (!navigator.sendBeacon("/api/contact-events", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/contact-events", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
  } catch { /* Contact navigation always takes priority. */ }
  return reference;
}
