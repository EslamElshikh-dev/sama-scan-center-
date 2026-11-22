import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const isValidMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId ?? "");
const adsId = "AW-18360481022";

export function GoogleAnalytics() {
  const analyticsId = isValidMeasurementId ? measurementId : undefined;

  return (
    <>
      {/* Mounted by both App Router root layouts. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script id="google-analytics" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
          window.gtag('js', new Date());
          window.gtag('config', '${adsId}', { send_page_view: false, groups: 'ads', allow_ad_personalization_signals: false });
          ${analyticsId ? `
            window.gtag('config', '${analyticsId}', { send_page_view: false, groups: 'analytics', allow_google_signals: false, allow_ad_personalization_signals: false });
            // Capture the landing URL before ClickTracker removes campaign parameters.
            window.gtag('event', 'page_view', {
              page_location: window.location.origin + window.location.pathname + window.location.search,
              send_to: 'analytics'
            });
          ` : ""}
        `}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId ?? adsId}`}
        strategy="afterInteractive"
      />
    </>
  );
}
