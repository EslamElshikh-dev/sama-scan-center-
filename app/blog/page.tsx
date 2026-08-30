import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { blogPosts } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "مدونة الأشعة والتصوير الطبي في الرياض",
  description: "مقالات تثقيفية من سما سكان عن الرنين المغناطيسي، السونار، الدوبلر، الأشعة المقطعية، والاستعداد لفحوص التصوير الطبي في الرياض.",
  path: "/blog",
  keywords: ["معمل أشعة بالرياض", "رنين مغناطيسي", "سونار", "أشعة سونار", "أشعة مقطعية"],
});

export default function BlogPage() {
  return (
    <main id="main-content">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "@id": `${site.siteUrl}/blog#blog`,
          url: `${site.siteUrl}/blog`,
          name: "مدونة مركز سما سكان للأشعة",
          description: "محتوى تثقيفي عن التصوير الطبي وفحوص الأشعة في الرياض.",
          inLanguage: "ar-SA",
          publisher: { "@id": `${site.siteUrl}/#medical-center` },
          blogPost: blogPosts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${site.siteUrl}/blog/${post.slug}`,
            datePublished: post.published,
            dateModified: post.modified,
          })),
        }}
      />
      <PageHero
        eyebrow="Sama Scan Knowledge Hub"
        title="دليل الأشعة والتصوير الطبي"
        description="مقالات عملية تساعدك على فهم اسم الفحص، الاستعداد للموعد، وطرح الأسئلة الصحيحة قبل زيارة مركز الأشعة. المحتوى تثقيفي ولا يستبدل رأي الطبيب."
        breadcrumbs={[{ label: "المدونة", href: "/blog" }]}
      />

      <section className="section blog-directory">
        <div className="container">
          <div className="blog-grid">
            {blogPosts.map((post, index) => (
              <article className="blog-card" key={post.slug}>
                <div className="blog-card-top">
                  <span className="blog-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="blog-category">{post.category}</span>
                </div>
                <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
                <p>{post.excerpt}</p>
                <div className="blog-meta">
                  <span>{post.readingMinutes} دقائق قراءة</span>
                  <span>الرياض</span>
                </div>
                <div className="keyword-pills" aria-label="كلمات مرتبطة بالمقال">
                  {post.keywords.slice(0, 3).map((keyword) => <span key={keyword}>{keyword}</span>)}
                </div>
                <Link className="blog-read-link" href={`/blog/${post.slug}`}>اقرأ الدليل كاملًا ←</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section blog-note-section">
        <div className="container blog-note">
          <h2>معلومة طبية موثوقة تبدأ بسؤال واضح</h2>
          <p>المقالات هنا للتوعية العامة وتحسين فهم رحلة التصوير الطبي. التشخيص، اختيار نوع الفحص، تفسير النتائج، وأي تعليمات مرتبطة بحالة محددة يجب أن تبقى تحت إشراف الطبيب وفريق الأشعة.</p>
          <Link className="button button-secondary" href="/services">استعرض خدمات الأشعة</Link>
        </div>
      </section>
    </main>
  );
}
