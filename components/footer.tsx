import Link from "next/link";
import { Brand } from "@/components/brand";
import { Icon } from "@/components/icons";
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
          <a
            className="text-link"
            href={site.directions}
            target="_blank"
            rel="noopener noreferrer"
            data-cta="footer_directions"
          >
            الاتجاهات عبر خرائط Google <Icon name="arrow" width="17" height="17" />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>جميع الحقوق محفوظة لدى مركز سما سكان {new Date().getFullYear()} ©</p>
        <div className="es-dev-credit">
          <span>
            تم التصميم والتطوير بواسطة{" "}
            <a href="https://eslam-elshikh.com/" target="_blank" rel="noopener noreferrer">
              المهندس إسلام الشيخ
            </a>
          </span>
          <span lang="en">
            Developed By{" "}
            <a href="https://eslam-elshikh.com/" target="_blank" rel="noopener noreferrer">
              Eng. Eslam Elshikh
            </a>
          </span>
          <small lang="en">Cybersecurity Engineer | Web Developer | Google Product Expert</small>
        </div>
      </div>
    </footer>
  );
}
