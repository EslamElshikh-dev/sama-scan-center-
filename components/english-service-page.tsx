import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import type { EnglishService } from "@/lib/english-services";
import { services, site } from "@/lib/site";
import styles from "@/app/(english)/en/english.module.css";

export function EnglishServicePage({ content }: { content: EnglishService }) {
  const service = services.find(item => item.slug === content.slug)!;
  const url = `${site.siteUrl}/en/services/${content.slug}`;
  const whatsapp = `https://wa.me/${site.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello Sama Scan, I would like to ask about ${content.label}, the examination price and an available appointment.`)}`;
  return <main id="main-content">
    <JsonLd data={[
      { "@context": "https://schema.org", "@type": "MedicalClinic", "@id": `${site.siteUrl}/#medical-center`, name: site.nameEn,
        url: site.siteUrl, telephone: site.phoneE164, sameAs: [site.mapsProfile],
        address: { "@type": "PostalAddress", streetAddress: "4479 Faisal bin Turki bin Abdulaziz Street, Al Murabba", addressLocality: "Riyadh", postalCode: site.postalCode, addressCountry: "SA" } },
      { "@context": "https://schema.org", "@type": "WebPage", "@id": `${url}#webpage`, url, name: content.title, inLanguage: "en-SA", dateModified: service.modified,
        isPartOf: { "@id": `${site.siteUrl}/#website` }, publisher: { "@id": `${site.siteUrl}/#medical-center` } },
      { "@context": "https://schema.org", "@type": "Service", name: content.title, url,
        provider: { "@id": `${site.siteUrl}/#medical-center` }, areaServed: { "@type": "City", name: "Riyadh" } },
    ]} />
    <section className={styles.hero}><div className={`container ${styles.heroGrid}`}><div>
      <div className={styles.eyebrow}>AL MURABBA · RIYADH</div><h1>{content.title}</h1><p className={styles.intro}>{content.intro}</p>
      <div className={styles.actions}><a className={styles.primary} href={site.phoneDial} data-cta={`english_${content.slug}_call`}>Call reception <span>{site.phoneDisplay}</span></a><a className={styles.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer" data-cta={`english_${content.slug}_whatsapp`}>Ask on WhatsApp</a></div>
      <p className={styles.caption}>Saturday–Thursday, 9 am–9 pm. Confirm your appointment before travelling.</p>
      <Link className={styles.language} href={`/services/${content.slug}`} lang="ar-SA" dir="rtl">اقرأ معلومات الفحص بالعربية ←</Link>
    </div><figure className={styles.photo}><Image src={service.image} alt={`The actual ${content.label} room at Sama Scan in Riyadh`} fill preload sizes="(max-width: 850px) 100vw, 45vw" /><figcaption>Photographed inside Sama Scan</figcaption></figure></div></section>
    <section className={styles.section}><div className="container"><div className={styles.sectionHead}><span className={styles.eyebrow}>YOUR EXAMINATION REQUEST</span><h2>Confirm the details before your visit</h2><p>{content.exams}</p></div>
      <div className={styles.cards}><article><span>01</span><h3>The examination</h3><p>Use the name and body area written on your doctor’s request. Ask reception to confirm the exact examination and any preparation instructions.</p></article><article><span>02</span><h3>The price and appointment</h3><p>Ask for the final price and what it includes. Sending an appointment request is the first step; reception confirms the examination and time with you.</p></article><article><span>03</span><h3>Your images and report</h3><p>Confirm how and when your images and report will be provided. Take the results back to the doctor who requested the examination.</p></article></div>
      <Link className={styles.textLink} href={`/contact?service=${content.slug}#booking-form`}>Send an appointment request (Arabic form) →</Link>
    </div></section>
    <section className={`${styles.section} ${styles.location}`}><div className={`container ${styles.locationGrid}`}><div><span className={styles.eyebrow}>FIND THE CENTER</span><h2>Your visit to Al Murabba</h2><p>4479 Faisal bin Turki bin Abdulaziz Street, Al Murabba, Riyadh 12584, Saudi Arabia.</p><a className={styles.primary} href={site.directions} target="_blank" rel="noopener noreferrer" data-cta={`english_${content.slug}_directions`}>Open directions</a></div><div className={styles.infoCard}><h3>Before the examination</h3><p>Preparation depends on the requested examination. Follow the instructions given by your doctor and the imaging team.</p><a href={content.guide} target="_blank" rel="noopener noreferrer">Patient information from RadiologyInfo →</a><p className={styles.caption}>Publisher: Sama Scan Radiology Center.<br />Updated: 12 November 2026.</p></div></div></section>
    <section className={styles.other}><div className="container"><span>More information</span><div><Link href="/en/services/mri-riyadh">MRI in Riyadh →</Link><Link href="/en/services/ultrasound-riyadh">Ultrasound in Riyadh →</Link><Link href="/about">About the center (Arabic) →</Link></div></div></section>
  </main>;
}
