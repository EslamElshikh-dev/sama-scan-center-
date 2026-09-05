import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
import { MapEmbed } from "@/components/map-embed";
import { navItems, services, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <Brand />
          <p>
            مركز للأشعة والتصوير الطبي في حي المربع بمدينة الرياض. تواصل معنا
            لتأكيد الفحص المطلوب وتعليمات التحضير والموعد المناسب.
          </p>
          <a
            className="footer-contact"
            href={site.phoneDial}
            data-cta="footer_call"
          >
            <Icon name="call" width="18" height="18" /> {site.phoneDisplay}
          </a>
        </div>
        <div>
          <h2>روابط سريعة</h2>
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/privacy">الخصوصية والتنبيه الطبي</Link>
            </li>
          </ul>
        </div>
        <div>
          <h2>خدمات المركز</h2>
          <ul>
            {services.map((service) => (
              <li key={service.slug}>
                <Link href={`/services/${service.slug}`}>
                  {service.shortTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>العنوان</h2>
          <p>{site.address}</p>
          <MapEmbed compact />
        </div>
      </div>
      <div className="container footer-bottom">
        <p>جميع الحقوق محفوظة لدى مركز سما سكان {new Date().getFullYear()} ©</p>
        <div className="es-dev-credit">
          <p className="es-dev-credit-line">
            <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noopener noreferrer">
              المهندس إسلام الشيخ
            </a>
            <span aria-hidden="true">|</span>
            <span lang="en" dir="ltr">
              Designed &amp; developed by{" "}
              <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noopener noreferrer">
                Eng. Eslam Elshikh
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
