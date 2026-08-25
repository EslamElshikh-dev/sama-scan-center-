import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";

export function Header() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        الانتقال إلى المحتوى
      </a>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>
            <Icon name="map" width="16" height="16" /> حي المربع، الرياض
          </span>
          <a href={site.phoneDial} data-cta="header_top_call" dir="ltr">
            <Icon name="call" width="16" height="16" /> {site.phoneDisplay}
          </a>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <Brand priority />
          <nav className="desktop-nav" aria-label="التنقل الرئيسي">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            className="button button-sm header-cta"
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="header_whatsapp"
          >
            <Icon name="whatsapp" width="19" height="19" /> حجز واستفسار
          </a>
          <details className="mobile-nav">
            <summary aria-label="فتح قائمة التنقل">
              <Icon name="menu" width="25" height="25" />
            </summary>
            <nav aria-label="التنقل على الجوال">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
              <a href={site.phoneDial}>اتصل الآن</a>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}
