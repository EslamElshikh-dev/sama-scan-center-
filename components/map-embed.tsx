"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { site } from "@/lib/site";

export function MapEmbed() {
  const [visible, setVisible] = useState(false);

  if (visible) {
    return (
      <div className="map-frame">
        <iframe
          title="موقع مركز سما سكان على خرائط Google"
          src={site.mapEmbed}
          width="100%"
          height="420"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="map-placeholder">
      <div className="map-rings" aria-hidden="true">
        <span />
        <span />
        <i />
      </div>
      <div>
        <span className="eyebrow">تحميل يحافظ على سرعة الصفحة</span>
        <h2>موقعنا في حي المربع</h2>
        <p>{site.address}</p>
        <div className="button-row">
          <button
            className="button"
            type="button"
            onClick={() => setVisible(true)}
            data-cta="load_map"
          >
            <Icon name="map" width="19" height="19" /> عرض الخريطة التفاعلية
          </button>
          <a
            className="button button-secondary"
            href={site.directions}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="map_directions"
          >
            بدء الاتجاهات
          </a>
        </div>
      </div>
    </div>
  );
}
