import Link from "next/link";
import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { site } from "@/lib/site";

type Crumb = { label: string; href: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ label: "الرئيسية", href: "/" }, ...items];

  return (
    <>
      <nav className="breadcrumbs" aria-label="مسار الصفحة">
        {all.map((item, index) => (
          <span key={item.href}>
            {index > 0 ? <Icon name="arrow" width="14" height="14" /> : null}
            {index === all.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.label,
            item: `${site.siteUrl}${item.href === "/" ? "" : item.href}`,
          })),
        }}
      />
    </>
  );
}
