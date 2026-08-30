import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { blogPosts, getBlogPost } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import { services, site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return createPageMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    keywords: post.keywords,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const relatedServices = services.filter((service) => post.relatedServices.includes(service.slug));
  const articleUrl = `${site.siteUrl}/blog/${post.slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${articleUrl}#article`,
        headline: post.title,
        description: post.description,
        url: articleUrl,
        datePublished: post.published,
        dateModified: post.modified,
        inLanguage: "ar-SA",
        articleSection: post.category,
        keywords: post.keywords.join(", "),
        author: { "@id": `${site.siteUrl}/#medical-center` },
        publisher: { "@id": `${site.siteUrl}/#medical-center` },
        mainEntityOfPage: { "@id": articleUrl },
        isPartOf: { "@id": `${site.siteUrl}/blog#blog` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: site.siteUrl },
          { "@type": "ListItem", position: 2, name: "المدونة", item: `${site.siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: articleUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main id="main-content">
      <JsonLd data={schema} />
      <section className="article-hero-medical">
        <div className="container article-hero-inner">
          <nav className="article-breadcrumbs" aria-label="مسار الصفحة">
            <Link href="/">الرئيسية</Link><span>/</span><Link href="/blog">المدونة</Link><span>/</span><span>{post.category}</span>
          </nav>
          <span className="eyebrow">{post.category}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="article-meta-medical">
            <span>{post.readingMinutes} دقائق قراءة</span><span>آخر تحديث: 30 أغسطس 2026</span><span>محتوى تثقيفي</span>
          </div>
        </div>
      </section>

      <section className="section medical-article-section">
        <div className="container medical-article-layout">
          <article className="medical-article">
            <div className="article-intro-box">
              {post.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>

            <div className="article-toc">
              <strong>في هذا الدليل</strong>
              <ol>{post.sections.map((section) => <li key={section.heading}><a href={`#${section.heading}`}>{section.heading}</a></li>)}</ol>
            </div>

            {post.sections.map((section) => (
              <section className="article-copy-section" id={section.heading} key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              </section>
            ))}

            <div className="medical-disclaimer">
              <strong>تنبيه طبي</strong>
              <p>هذا المحتوى للتثقيف العام ولا يقدم تشخيصًا أو توصية علاجية. اتبع إحالة الطبيب وتعليمات فريق الأشعة، وأكد توفر الفحص وتحضيره قبل الحضور.</p>
            </div>

            <section className="article-faq" aria-labelledby="faq-title">
              <span className="eyebrow">FAQ</span>
              <h2 id="faq-title">أسئلة شائعة</h2>
              {post.faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </section>
          </article>

          <aside className="medical-article-sidebar">
            <div className="article-side-card sticky-card">
              <span className="eyebrow">قبل الحجز</span>
              <h2>أرسل اسم الفحص كما في طلب الطبيب</h2>
              <p>يساعد ذلك فريق المركز على تأكيد توفر الخدمة وتعليمات التحضير والموعد المناسب.</p>
              <a className="button" href={site.whatsapp} target="_blank" rel="noopener noreferrer">استفسر عبر واتساب</a>
              <a className="button button-secondary" href={site.phoneDial}>اتصل بالمركز</a>
            </div>

            {relatedServices.length > 0 && (
              <div className="article-side-card">
                <h2>خدمات مرتبطة</h2>
                <div className="related-service-links">
                  {relatedServices.map((service) => <Link key={service.slug} href={`/services/${service.slug}`}>{service.title}</Link>)}
                </div>
              </div>
            )}

            <div className="article-side-card">
              <h2>موقع سما سكان</h2>
              <p>{site.shortAddress}</p>
              <Link className="blog-read-link" href="/location">الخريطة والاتجاهات ←</Link>
            </div>
          </aside>
        </div>
      </section>

      <section className="section related-articles-section">
        <div className="container">
          <div className="section-head"><span className="eyebrow">اقرأ أيضًا</span><h2>مقالات مرتبطة بالتصوير الطبي</h2></div>
          <div className="related-article-grid">
            {blogPosts.filter((item) => item.slug !== post.slug).slice(0, 3).map((item) => (
              <article key={item.slug}><span>{item.category}</span><h3><Link href={`/blog/${item.slug}`}>{item.title}</Link></h3><p>{item.excerpt}</p></article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
