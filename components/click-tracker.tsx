"use client";

import { useEffect } from "react";
import {
  getAnalyticsAttribution,
  getAttributionLabel,
  getSessionAttribution,
  sendAnalyticsEvent,
} from "@/lib/attribution";

export function ClickTracker() {
  useEffect(() => {
    getSessionAttribution();

    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>("[data-cta]");
      if (!target) return;

      const anchor = target instanceof HTMLAnchorElement
        ? target
        : target.closest<HTMLAnchorElement>("a");
      const href = anchor?.getAttribute("href") ?? "";
      const attribution = getSessionAttribution();
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
        const messageWithoutOldSource = currentMessage
          .replace(/\n?مصدر الطلب:[^\n]*/g, "")
          .trim();
        whatsappUrl.searchParams.set(
          "text",
          `${messageWithoutOldSource}\nمصدر الطلب: ${getAttributionLabel(attribution)}`.trim(),
        );
        anchor.href = whatsappUrl.toString();
      }

      const eventData = {
        cta_name: target.dataset.cta,
        cta_destination: destination,
        page_path: window.location.pathname,
        ...getAnalyticsAttribution(attribution),
      };
      sendAnalyticsEvent("cta_click", eventData);
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
