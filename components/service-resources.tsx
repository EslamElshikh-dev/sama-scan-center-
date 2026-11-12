import Link from "next/link";
import { blogPosts } from "@/lib/blog";
import { services } from "@/lib/site";
import styles from "./service-support.module.css";

export function ServiceResources({ slug }: { slug: string }) {
  const service = services.find(item => item.slug === slug);
  const articles = blogPosts.filter(post => post.relatedServices.includes(slug)).slice(0, 3);
  if (!service || !articles.length) return null;
  return <section className={styles.resources} aria-labelledby={`resources-${slug}`}><div className="container">
    <div className="section-head"><span className="eyebrow">أدلة تساعدك قبل الزيارة</span><h2 id={`resources-${slug}`}>اقرأ أكثر عن {service.shortTitle}</h2><p>ابدأ بالدليل الأقرب إلى طلبك، وأكد تفاصيل التحضير مع فريق المركز.</p></div>
    <div className={styles.resourceGrid}>{articles.map(article => <article key={article.slug}><span>{article.category}</span>
      <h3><Link href={`/blog/${article.slug}`}>{article.title}</Link></h3><p>{article.excerpt}</p>
      <Link className={styles.readLink} href={`/blog/${article.slug}`}>اقرأ الدليل ←</Link></article>)}</div>
    <Link className={styles.libraryLink} href="/blog">كل أدلة الأشعة والتحضير ←</Link>
  </div></section>;
}
