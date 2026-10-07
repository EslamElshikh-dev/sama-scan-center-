import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const isValidMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId ?? "");
const adsId = "AW-18360481022";

export function GoogleAnalytics() {
  const analyticsId = isValidMeasurementId ? measurementId : undefined;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId ?? adsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          ${analyticsId ? `gtag('config', '${analyticsId}', { send_page_view: true, groups: 'analytics', allow_google_signals: false, allow_ad_personalization_signals: false });` : ""}
          gtag('config', '${adsId}', { send_page_view: false, groups: 'ads', allow_ad_personalization_signals: false });
        `}
      </Script>
    </>
  );
}
