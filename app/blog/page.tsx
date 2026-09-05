import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PageHero } from "@/components/page-hero";
import { blogPosts, getBlogImage } from "@/lib/blog";
import { createPageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "مدونة الأشعة والتصوير الطبي في الرياض",
  description: "20 دليلًا طبيًا تثقيفيًا من سما سكان عن الرنين المغناطيسي والسونار والدوبلر و3D و4D، مع التحضير والسلامة وتقارير الأشعة بالرياض.",
  path: "/blog",
  keywords: ["مركز أشعة بالرياض", "رنين مغناطيسي", "سونار", "أشعة دوبلر", "سونار 4D"],
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
            image: `${site.siteUrl}${getBlogImage(post).src}`,
            datePublished: post.published,
            dateModified: post.modified,
          })),
        }}
      />
      <PageHero
        eyebrow="Sama Scan Knowledge Hub"
        title="دليل الأشعة والتصوير الطبي"
        description={`${blogPosts.length} دليلًا طبيًا تثقيفيًا عن الرنين المغناطيسي والسونار والدوبلر و3D و4D، تساعدك على الاستعداد وطرح الأسئلة الصحيحة قبل زيارة مركز الأشعة.`}
        breadcrumbs={[{ label: "المدونة", href: "/blog" }]}
      />

      <section className="section blog-directory">
        <div className="container">
          <div className="blog-directory-intro">
            <div>
              <span className="eyebrow">مكتبة المريض</span>
              <h2>محتوى منظم حسب رحلة الفحص</h2>
              <p>من فهم طلب الطبيب والتحضير، إلى السلامة والتقرير بعد الفحص. اختر الموضوع الأقرب إلى موعدك، ثم أكد التعليمات الخاصة بحالتك مع المركز.</p>
            </div>
            <div className="blog-library-stats" aria-label="إحصاءات مكتبة المقالات">
              <span><b>{blogPosts.length}</b> مقالًا طبيًا</span>
              <span><b>4</b> عناقيد خدمات</span>
              <span><b>100%</b> محتوى تثقيفي</span>
            </div>
          </div>
          <div className="blog-grid">
            {blogPosts.map((post, index) => {
              const postImage = getBlogImage(post);
              return (
                <article className="blog-card" key={post.slug}>
                  <Link className="blog-card-visual" href={`/blog/${post.slug}`} aria-label={`اقرأ: ${post.title}`}>
                    <Image
                      src={postImage.src}
                      alt={postImage.alt}
                      fill
                      sizes="(max-width: 900px) 100vw, 50vw"
                    />
                    {index < 10 ? <span className="blog-new-badge">جديد</span> : null}
                  </Link>
                  <div className="blog-card-body">
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
                  </div>
                </article>
              );
            })}
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
