import { Icon } from "@/components/icons";
import { site } from "@/lib/site";

export function FloatingActions({ english = false }: { english?: boolean }) {
  return (
    <div className="floating-actions" aria-label={english ? "Contact Sama Scan" : "وسائل التواصل السريع"}>
      <a
        className="floating-button floating-call"
        href={site.phoneDial}
        aria-label={english ? `Call Sama Scan on ${site.phoneDisplay}` : `اتصل بمركز سما سكان على ${site.phoneDisplay}`}
        data-cta="floating_call"
      >
        <Icon name="call" width="25" height="25" />
        <span>{english ? "Call" : "اتصال"}</span>
      </a>
      <a
        className="floating-button floating-whatsapp"
        href={site.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={english ? "Contact Sama Scan on WhatsApp" : "تواصل مع مركز سما سكان عبر واتساب"}
        data-cta="floating_whatsapp"
      >
        <Icon name="whatsapp" width="27" height="27" />
        <span>{english ? "WhatsApp" : "واتساب"}</span>
      </a>
    </div>
  );
}
