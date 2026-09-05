import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { blogPosts, getBlogImage, getBlogPost, getRelatedBlogPosts } from "@/lib/blog";
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
  const relatedArticles = getRelatedBlogPosts(post);
  const articleImage = getBlogImage(post);
  const articleUrl = `${site.siteUrl}/blog/${post.slug}`;
  const articleImageUrl = `${site.siteUrl}${articleImage.src}`;
  const modifiedDate = new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${post.modified}T12:00:00Z`));
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
        image: {
          "@type": "ImageObject",
          url: articleImageUrl,
          caption: articleImage.caption,
        },
        citation: post.sources?.map((source) => source.url),
        isAccessibleForFree: true,
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
        <div className="container article-hero-grid">
          <div className="article-hero-inner">
            <nav className="article-breadcrumbs" aria-label="مسار الصفحة">
              <Link href="/">الرئيسية</Link><span>/</span><Link href="/blog">المدونة</Link><span>/</span><span>{post.category}</span>
            </nav>
            <span className="eyebrow">{post.category}</span>
            <h1>{post.title}</h1>
            <p>{post.excerpt}</p>
            <div className="article-meta-medical">
              <span>{post.readingMinutes} دقائق قراءة</span>
              <span>آخر تحديث: <time dateTime={post.modified}>{modifiedDate}</time></span>
              <span>مراجعة مصادر طبية</span>
            </div>
          </div>
          <figure className="article-hero-figure">
            <Image
              src={articleImage.src}
              alt={articleImage.alt}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 38vw"
            />
            {articleImage.caption ? <figcaption>{articleImage.caption}</figcaption> : null}
          </figure>
        </div>
      </section>

      <section className="article-trust-bar" aria-label="معايير المحتوى الطبي">
        <div className="container">
          <span>محتوى تثقيفي واضح</span>
          <span>مصادر طبية مرجعية</span>
          <span>لا يستبدل تقييم الطبيب</span>
          <span>مخصص لرحلة المريض قبل الفحص</span>
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
              <ol>{post.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`}>{section.heading}</a></li>)}</ol>
            </div>

            {post.sections.map((section, index) => (
              <section className="article-copy-section" id={`section-${index + 1}`} key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets ? <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
              </section>
            ))}

            <div className="medical-disclaimer">
              <strong>تنبيه طبي</strong>
              <p>هذا المحتوى للتثقيف العام ولا يقدم تشخيصًا أو توصية علاجية. اتبع إحالة الطبيب وتعليمات فريق الأشعة، وأكد توفر الفحص وتحضيره قبل الحضور. عند وجود أعراض حادة أو مفاجئة اطلب تقييمًا طبيًا عاجلًا.</p>
            </div>

            {post.sources?.length ? (
              <section className="article-sources" aria-labelledby="sources-title">
                <span className="eyebrow">المراجعة المرجعية</span>
                <h2 id="sources-title">مصادر طبية موثوقة</h2>
                <p>تمت صياغة المعلومات وتدقيقها بالرجوع إلى المصادر المهنية التالية، مع تبسيطها للقارئ دون نقل حرفي.</p>
                <ul>
                  {post.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.label}</a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

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
            {relatedArticles.map((item) => (
              <article key={item.slug}><span>{item.category}</span><h3><Link href={`/blog/${item.slug}`}>{item.title}</Link></h3><p>{item.excerpt}</p></article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
