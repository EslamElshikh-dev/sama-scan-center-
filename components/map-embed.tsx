import { site } from "@/lib/site";

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
    </div>
  );
}
