import { sendGoogleTagEvent } from "@/lib/attribution";

const CONTACT_CONVERSIONS: Record<string, string> = {
  phone: "AW-18360481022/5YNFCKHlgJQdEP7p-rJE",
  whatsapp: "AW-18360481022/LWtYCKTlgJQdEP7p-rJE",
};

/** Measures a contact-link click, never a completed call or appointment. */
export function sendContactConversion(destination: string) {
  const sendTo = CONTACT_CONVERSIONS[destination];
  if (!sendTo) return;
  sendGoogleTagEvent("conversion", { send_to: sendTo, value: 0, currency: "SAR" });
}
