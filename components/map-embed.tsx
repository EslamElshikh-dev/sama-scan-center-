import { site } from "@/lib/site";
import { Icon } from "@/components/icons";

export function MapEmbed({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`map-frame${compact ? " map-frame-compact" : ""}`}>
      <iframe
        title={compact ? "خريطة موقع مركز سما سكان" : "موقع مركز سما سكان على خرائط Google"}
        src={site.mapEmbed}
        width="100%"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      {!compact && (
        <>
          <span className="map-location-badge">
            <Icon name="map" width="16" height="16" /> حي المربع · الرياض
          </span>
          <div className="map-details-card">
            <div>
              <strong>مركز سما سكان للأشعة</strong>
              <span>{site.address}</span>
            </div>
            <div className="map-card-actions">
              <a
                href={site.directions}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="map_directions"
              >
                بدء الاتجاهات <Icon name="arrow" width="15" height="15" />
              </a>
              <a
                href={site.mapsProfile}
                target="_blank"
                rel="noopener noreferrer"
                data-cta="google_maps_profile"
              >
                خرائط Google
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
