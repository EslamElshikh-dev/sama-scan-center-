"use client";

import { useId, useState, type ReactNode } from "react";

export function FooterMap({ directions, children }: { directions: string; children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const mapId = useId();

  return (
    <>
      <div className="footer-map-actions">
        <button
          type="button"
          className="button button-secondary"
          aria-expanded={opened}
          aria-controls={mapId}
          onClick={() => setOpened(value => !value)}
        >
          {opened ? "إخفاء الخريطة" : "عرض الخريطة"}
        </button>
        <a href={directions} target="_blank" rel="noopener noreferrer" data-cta="footer_map_directions">
          افتح الاتجاهات
        </a>
      </div>
      <div id={mapId} hidden={!opened}>
        {opened && children}
      </div>
    </>
  );
}
