import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const isValidMeasurementId = /^G-[A-Z0-9]+$/.test(measurementId ?? "");

export function GoogleAnalytics() {
  if (!measurementId || !isValidMeasurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="beforeInteractive"
      />
      <Script id="google-analytics" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
