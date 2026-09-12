"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function ClickTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-cta]");
      if (!target) return;

      const anchor = target instanceof HTMLAnchorElement
        ? target
        : target.closest<HTMLAnchorElement>("a");
      const href = anchor?.getAttribute("href") ?? "";
      const trafficSource =
        new URLSearchParams(window.location.search).get("utm_source") || "direct";
      const destination = href.startsWith("tel:")
        ? "phone"
        : href.includes("wa.me")
          ? "whatsapp"
          : href.includes("google.com/maps") || href.includes("maps.app.goo.gl")
            ? "maps"
            : href.startsWith("/")
              ? "internal"
              : href
                ? "external"
                : "button";

      if (anchor && destination === "whatsapp") {
        const whatsappUrl = new URL(anchor.href);
        const currentMessage = whatsappUrl.searchParams.get("text") ?? "";
        if (!currentMessage.includes("مصدر الطلب:")) {
          const sourceLabel =
            trafficSource === "google"
              ? "ملف Google التجاري"
              : "الموقع الإلكتروني";
          whatsappUrl.searchParams.set(
            "text",
            `${currentMessage}\nمصدر الطلب: ${sourceLabel}`.trim(),
          );
          anchor.href = whatsappUrl.toString();
        }
      }

      const eventData = {
        cta_name: target.dataset.cta,
        cta_destination: destination,
        page_path: window.location.pathname,
        traffic_source: trafficSource,
      };
      window.dataLayer ??= [];
      window.dataLayer.push({
        event: "cta_click",
        ...eventData,
      });
      window.gtag?.("event", "cta_click", eventData);
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
