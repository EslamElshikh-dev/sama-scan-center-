"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "@/components/icons";
import { site } from "@/lib/site";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const quickTopics = [
  "حجز موعد",
  "خدمات الأشعة",
  "تحضير الرنين",
  "موقع المركز",
];

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

function getReply(message: string) {
  const value = message.trim().toLowerCase();

  if (includesAny(value, ["السلام", "هلا", "مرحبا", "أهلين", "صباح", "مساء"])) {
    return "هلا والله 👋 أنا سَنَة، مساعدة سما سكان. أقدر أساعدك في اختيار صفحة الفحص، تعليمات التحضير العامة، الحجز أو الوصول للمركز.";
  }

  if (includesAny(value, ["حجز", "موعد", "احجز", "واتساب", "اتصال", "تواصل"])) {
    return "للحجز السريع أرسل اسم الفحص كما هو مكتوب في الطلب الطبي عبر واتساب، أو اتصل بالمركز لتأكيد الموعد وتعليمات التحضير قبل الحضور.";
  }

  if (includesAny(value, ["خدمات", "فحوصات", "الأشعة", "اشعة", "تقدمون", "متوفر"])) {
    return "تشمل خدمات سما سكان: الرنين المغناطيسي MRI، السونار والموجات فوق الصوتية، الدوبلر والدوبلكس، وتصوير الأجنة ثلاثي ورباعي الأبعاد. أخبرني باسم الفحص لأعطيك معلوماته العامة.";
  }

  if (includesAny(value, ["رنين", "mri", "مغناطيسي"])) {
    return "الرنين المغناطيسي لا يستخدم أشعة مؤينة. قبل الموعد أخبر فريق المركز عن منظم ضربات القلب، أي زرعات أو قطع معدنية، العمليات السابقة، الحمل أو احتماله، وأمراض الكلى أو الحساسية إذا كان الفحص قد يتطلب مادة تباين.";
  }

  if (includesAny(value, ["سونار", "موجات", "ultrasound", "ثلاثي", "رباعي", "3d", "4d"])) {
    return "تعليمات السونار تختلف حسب المنطقة ونوع الفحص؛ بعض الفحوصات قد تتطلب صيامًا أو امتلاء المثانة. أرسل اسم الفحص الموجود في الإحالة لتأكيد التعليمات مع فريق المركز.";
  }

  if (includesAny(value, ["دوبلر", "دوبلكس", "أوعية", "شرايين", "أوردة"])) {
    return "الدوبلر والدوبلكس من فحوصات الموجات فوق الصوتية المستخدمة لتقييم تدفق الدم والأوعية وفق طلب الطبيب. تواصل مع المركز باسم الفحص للتأكد من التحضير والموعد.";
  }

  if (includesAny(value, ["تحضير", "استعداد", "صيام", "قبل الفحص", "ممنوع"])) {
    return "التحضير يعتمد على نوع الفحص والمنطقة المطلوبة واحتمال استخدام مادة تباين. المرجع النهائي هو تعليمات الطبيب وفريق الأشعة؛ تواصل قبل الحضور ولا توقف أي دواء من نفسك.";
  }

  if (includesAny(value, ["حامل", "حمل", "حامل؟", "pregnant"])) {
    return "إذا كان هناك حمل أو احتمال وجوده، أخبر الطبيب وفريق الأشعة قبل الفحص. يحدد المختص نوع التصوير المناسب وتوقيته بحسب الحالة الطبية.";
  }

  if (includesAny(value, ["سعر", "أسعار", "تكلفة", "كم", "تأمين"])) {
    return "تختلف التكلفة حسب نوع الفحص والمنطقة والتفاصيل المكتوبة في الإحالة، وقد تختلف التغطية التأمينية. أرسل اسم الفحص للمركز للحصول على المعلومة الدقيقة.";
  }

  if (includesAny(value, ["نتيجة", "نتائج", "تقرير", "تقارير", "استلام"])) {
    return "للاستفسار عن جاهزية التقرير أو طريقة الاستلام، تواصل مباشرة مع فريق المركز مع بيانات الموعد. لا ترسل تقارير أو معلومات صحية حساسة داخل المحادثة.";
  }

  if (includesAny(value, ["موقع", "عنوان", "وين", "أين", "اتجاه", "المربع"])) {
    return `مركز سما سكان في حي المربع بالرياض: ${site.address}. يمكنك فتح الاتجاهات المباشرة من زر الموقع.`;
  }

  if (includesAny(value, ["تشخيص", "علاج", "دواء", "مرض", "وش فيني", "ايش عندي"])) {
    return "أقدر أوضح معلومات المركز والفحوصات فقط، لكن لا أقدم تشخيصًا أو علاجًا. راجع طبيبك، وفي الحالات العاجلة تواصل مع خدمات الطوارئ.";
  }

  return "أقدر أساعدك في الحجز، خدمات الأشعة، التحضير للفحص، الأسعار العامة أو موقع المركز. اكتب اسم الفحص أو اختر أحد الاختصارات بالأسفل، ولتفاصيل حالتك تواصل مع فريق المركز.";
}

export function SanaAssistant() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      text: "هلا، أنا سَنَة من سما سكان 👋 كيف أقدر أساعدك اليوم؟",
    },
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(false), 9000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sana-chat-open", open);
    return () => document.body.classList.remove("sana-chat-open");
  }, [open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || busy) return;

    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text: message },
    ]);
    setInput("");
    setBusy(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: getReply(message) },
      ]);
      setBusy(false);
    }, 420);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className={`sana-assistant${open ? " is-open" : ""}`} dir="rtl">
      {!open && showHint ? (
        <button
          className="sana-hint"
          type="button"
          onClick={() => {
            setOpen(true);
            setShowHint(false);
          }}
        >
          <b>هلا، أنا سَنَة</b>
          <span>أساعدك في الحجز ومعلومات الفحوصات</span>
        </button>
      ) : null}

      {!open ? (
        <button
          className="sana-launcher"
          type="button"
          aria-label="فتح محادثة سَنَة، مساعدة سما سكان"
          onClick={() => {
            setOpen(true);
            setShowHint(false);
          }}
        >
          <span className="sana-launcher-image">
            <Image
              src="/sana-assistant.webp"
              alt=""
              fill
              sizes="78px"
            />
          </span>
          <span className="sana-online-dot" aria-hidden="true" />
          <span className="sana-launcher-label">اسأل سَنَة</span>
        </button>
      ) : (
        <section className="sana-panel" role="dialog" aria-label="محادثة سَنَة، مساعدة سما سكان">
          <header className="sana-panel-header">
            <span className="sana-header-avatar">
              <Image src="/sana-assistant.webp" alt="سَنَة، مساعدة سما سكان" fill sizes="56px" />
            </span>
            <span className="sana-header-copy">
              <b>سَنَة</b>
              <small><i /> مساعدة سما سكان الذكية</small>
            </span>
            <button className="sana-close" type="button" onClick={() => setOpen(false)} aria-label="إغلاق المحادثة">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </header>

          <div className="sana-safety-note">
            للمعلومات العامة والحجز فقط، ولا تستبدل استشارة الطبيب.
          </div>

          <div className="sana-messages" ref={messagesRef} aria-live="polite">
            {messages.map((message) => (
              <div className={`sana-message sana-message-${message.role}`} key={message.id}>
                {message.text}
              </div>
            ))}
            {busy ? (
              <div className="sana-typing" aria-label="سَنَة تكتب">
                <i /><i /><i />
              </div>
            ) : null}
          </div>

          <div className="sana-quick-topics" aria-label="اختصارات المحادثة">
            {quickTopics.map((topic) => (
              <button type="button" key={topic} onClick={() => sendMessage(topic)} disabled={busy}>
                {topic}
              </button>
            ))}
          </div>

          <form className="sana-form" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="اكتب سؤالك هنا..."
              aria-label="اكتب سؤالك لسَنَة"
              maxLength={240}
              autoComplete="off"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="إرسال السؤال">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 16-8-5 16-3-6-8-2Zm8 2 8-10" /></svg>
            </button>
          </form>

          <footer className="sana-panel-footer">
            <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" data-cta="sana_whatsapp">
              <Icon name="whatsapp" width="18" height="18" /> واتساب
            </a>
            <a href={site.phoneDial} data-cta="sana_call">
              <Icon name="call" width="17" height="17" /> اتصال
            </a>
            <Link href="/location" onClick={() => setOpen(false)}>
              <Icon name="map" width="17" height="17" /> الموقع
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
