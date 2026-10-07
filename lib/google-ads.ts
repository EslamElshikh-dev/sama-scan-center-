const CONTACT_CONVERSIONS: Record<string, string> = {
  phone: "AW-18360481022/5YNFCKHlgJQdEP7p-rJE",
  whatsapp: "AW-18360481022/LWtYCKTlgJQdEP7p-rJE",
};

/** Measures a contact-link click, never a completed call or appointment. */
export function sendContactConversion(destination: string) {
  const sendTo = CONTACT_CONVERSIONS[destination];
  if (!sendTo) return;
  window.dataLayer ??= [];
  const parameters = { send_to: sendTo, value: 0, currency: "SAR" };
  if (window.gtag) {
    window.gtag("event", "conversion", parameters);
  } else {
    // gtag.js consumes command arguments after loading, not plain event objects.
    function queue(...args: unknown[]) {
      window.dataLayer!.push(args);
    }
    queue("event", "conversion", parameters);
  }
}
