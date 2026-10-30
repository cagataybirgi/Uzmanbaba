import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ButtonLink, PageHeader, RuledRow, Shell } from "../components/ds";

/* ═══════════════════════════════════════════════════════════════════════════
 * Informational pages — about, support, contact, terms, privacy, refunds.
 *
 * All six share one editorial layout: a kicker, a large flush-left title,
 * a lead, then numbered ruled rows. The numbering is the structure — there
 * are no cards and no icons competing with the type.
 * ═══════════════════════════════════════════════════════════════════════ */

interface InfoSection {
  title: string;
  body: ReactNode;
}

function InfoPage({
  kicker,
  title,
  lead,
  sections,
  note,
}: {
  kicker: string;
  title: string;
  lead: string;
  sections: InfoSection[];
  note: string;
}) {
  return (
    <Shell className="py-14 md:py-20">
      <PageHeader kicker={kicker} title={title} lead={lead} size="display" />

      <div className="mt-14">
        {sections.map((section, i) => (
          <RuledRow
            key={section.title}
            index={String(i + 1).padStart(2, "0")}
            title={section.title}
          >
            {section.body}
          </RuledRow>
        ))}

        <p className="t-meta border-t-2 border-rule pt-7">{note}</p>
      </div>

      <ButtonLink to="/" variant="ghost" className="mt-10 -ml-4">
        Ana Sayfaya Dön
        <ArrowRight size={15} aria-hidden="true" />
      </ButtonLink>
    </Shell>
  );
}

/** A link inside body copy, in the system's accent. */
function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
    >
      {children}
    </Link>
  );
}

const PLACEHOLDER_NOTE =
  "Bu sayfanın içeriği şu anda örnek metindir ve yakında resmi içerikle güncellenecektir.";

const LAST_UPDATED = `Son güncelleme: ${new Date().toLocaleDateString("tr-TR")}`;

/* ── About ─────────────────────────────────────────────────────────────── */

export function About() {
  return (
    <InfoPage
      kicker="Hakkımızda"
      title="Baba sorunu çözer."
      lead="UzmanBaba, yerel hizmete ihtiyaç duyanlarla uzman hesaplarını tek bir platformda buluşturur."
      note={PLACEHOLDER_NOTE}
      sections={[
        {
          title: "Misyonumuz",
          body: "Ev tamiratından temizliğe, nakliyattan elektrik işlerine kadar günlük hayatın işlerini tek bir güvenli platformda topluyoruz. Amacımız, aradığınız uzmana dakikalar içinde, güvenle ulaşmanızı sağlamak.",
        },
        {
          title: "Güven Önceliğimiz",
          body: "Uzman hesapları e-posta doğrulamasından geçer. Müşteri yorumları yalnızca tamamlanmış rezervasyonlardan toplanır; puanlar gerçek işlere dayanır.",
        },
        {
          title: "Topluluğumuz",
          body: "Hizmet alan ve hizmet veren kullanıcılar için adil, şeffaf bir deneyim sunmak üzere çalışıyoruz.",
        },
      ]}
    />
  );
}

/* ── Support ───────────────────────────────────────────────────────────── */

export function Support() {
  return (
    <InfoPage
      kicker="Destek"
      title="Yardımcı olalım"
      lead="Hesabınız veya rezervasyonunuzla ilgili her türlü sorunuz için buradayız."
      note={PLACEHOLDER_NOTE}
      sections={[
        {
          title: "Sıkça Sorulan Sorular",
          body: (
            <>
              Rezervasyonumu nasıl iptal edebilirim? Uzman rezervasyonumu ne
              zaman onaylar? Memnun kalmazsam ne yapmalıyım? Uzman olmak için
              nasıl başvurabilirim?
            </>
          ),
        },
        {
          title: "Yanıt Sürelerimiz",
          body: "E-posta taleplerini geliş sırasına göre değerlendiriyoruz. Destek ihtiyacınız için bize e-posta veya telefonla ulaşabilirsiniz.",
        },
        {
          title: "Bize Ulaşın",
          body: (
            <>
              Sorununuzun çözümünü bulamadıysanız,{" "}
              <InlineLink to="/iletisim">İletişim sayfamız</InlineLink>{" "}
              üzerinden bize doğrudan yazabilirsiniz.
            </>
          ),
        },
      ]}
    />
  );
}

/* ── Contact ───────────────────────────────────────────────────────────── */

export function Contact() {
  return (
    <Shell className="py-14 md:py-20">
      <PageHeader
        kicker="İletişim"
        title="Bize ulaşın"
        lead="Sorularınız, geri bildirimleriniz ve iş birliği teklifleriniz için bekliyoruz."
        size="display"
      />

      <div className="mt-14">
        <RuledRow index="01" title="E-posta">
          <a
            href="mailto:destek@uzmanbaba.com"
            className="font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
          >
            destek@uzmanbaba.com
          </a>
        </RuledRow>

        <RuledRow index="02" title="Telefon">
          <a
            href="tel:+908500000000"
            className="tnum font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-700"
          >
            +90 850 000 00 00
          </a>
        </RuledRow>

        <RuledRow index="03" title="Adres">
          İstanbul, Türkiye
        </RuledRow>

        <RuledRow index="04" title="Çalışma Saatlerimiz">
          Pazartesi – Cuma: 09:00 – 18:00. Hafta sonu: Acil destek hattı 24/7
          açıktır.
        </RuledRow>

        <p className="t-meta border-t-2 border-rule pt-7">{PLACEHOLDER_NOTE}</p>
      </div>

      <ButtonLink to="/" variant="ghost" className="mt-10 -ml-4">
        Ana Sayfaya Dön
        <ArrowRight size={15} aria-hidden="true" />
      </ButtonLink>
    </Shell>
  );
}

/* ── Terms ─────────────────────────────────────────────────────────────── */

export function Terms() {
  return (
    <InfoPage
      kicker="Yasal"
      title="Kullanım Şartları"
      lead="UzmanBaba'yı kullanırken geçerli olan kurallar ve koşullar."
      note={LAST_UPDATED}
      sections={[
        {
          title: "Hizmet Kullanımı",
          body: "UzmanBaba'yı kullanarak bu şartları kabul etmiş sayılırsınız. Platformumuzu yalnızca yasalara uygun, gerçek hizmet ihtiyaçları için kullanmanız gerekir.",
        },
        {
          title: "Kullanıcı Sorumlulukları",
          body: "Hesap bilgilerinizin güvenliğinden siz sorumlusunuz. Yanıltıcı bilgi paylaşımı, sahte değerlendirme yazma veya platform dışında ödeme talep etme yasaktır.",
        },
        {
          title: "Ödeme ve İade",
          body: (
            <>
              Platform üzerinden yapılan ödemeler ve iptaller{" "}
              <InlineLink to="/iade-politikasi">İade Politikamıza</InlineLink>{" "}
              tabidir.
            </>
          ),
        },
      ]}
    />
  );
}

/* ── Privacy ───────────────────────────────────────────────────────────── */

export function Privacy() {
  return (
    <InfoPage
      kicker="Gizlilik"
      title="Gizlilik Politikası"
      lead="Verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuz hakkında."
      note={LAST_UPDATED}
      sections={[
        {
          title: "Veri Toplama",
          body: "Yalnızca hizmet sunumu için gerekli olan bilgileri (ad, e-posta, telefon, adres) topluyoruz. Bilgileriniz KVKK kapsamında korunur.",
        },
        {
          title: "Veri Kullanımı",
          body: "Bilgileriniz; rezervasyon yönetimi, uzmanla iletişim ve hizmet kalitesini artırma amaçlarıyla kullanılır. Üçüncü taraflara satılmaz veya pazarlama amacıyla paylaşılmaz.",
        },
        {
          title: "Haklarınız",
          body: (
            <>
              Verilerinize her zaman erişebilir, düzenleyebilir veya silinmesini
              talep edebilirsiniz. Bunun için{" "}
              <InlineLink to="/iletisim">iletişim sayfamızdan</InlineLink> bize
              ulaşmanız yeterli.
            </>
          ),
        },
      ]}
    />
  );
}

/* ── Refund policy ─────────────────────────────────────────────────────── */

// The rules below are what the backend enforces (bookings.service
// cancelBooking, payments.refunds). Change them together.
export function RefundPolicy() {
  return (
    <InfoPage
      kicker="Yasal"
      title="İade Politikası"
      lead="Ödemenizin ne zaman ve nasıl iade edildiği, açık ve kesintisiz."
      note="Son güncelleme: 24 Ekim 2026"
      sections={[
        {
          title: "Ödeme Ne Zaman Alınır",
          body: "Uzman fiyat verip rezervasyonu onayladıktan sonra ödemeyi iyzico'nun güvenli ödeme sayfasında yaparsınız. Kart bilgileriniz UzmanBaba'ya ulaşmaz. Uzman onaylamadan veya siz ödemeden önce yapılan iptallerde kartınızdan hiçbir tutar çekilmez.",
        },
        {
          title: "Hizmet Başlamadan İptal",
          body: "Randevu saatine kadar rezervasyonunuzu panelinizden istediğiniz zaman iptal edebilirsiniz. Ödeme yaptıysanız tutarın tamamı iade edilir, herhangi bir kesinti yapılmaz. Uzman rezervasyonu iptal ederse de ödemenizin tamamı iade edilir.",
        },
        {
          title: "Randevu Saatinden Sonra",
          body: (
            <>
              Randevu saati geçtikten sonra hizmet başlamış sayılır ve ödenmiş
              bir rezervasyon panelden iptal edilemez. Uzman gelmediyse veya bir
              sorun yaşadıysanız{" "}
              <InlineLink to="/destek">destek ekibimize</InlineLink> yazın;
              durumu inceleyip iadenizi biz başlatırız.
            </>
          ),
        },
        {
          title: "Şikâyet ve İtiraz",
          body: (
            <>
              Hizmet tamamlandıktan sonra 7 gün içinde{" "}
              <InlineLink to="/destek">destek</InlineLink> üzerinden şikâyet
              bildirebilirsiniz. Her iki tarafı dinleyerek değerlendiririz;
              şikâyetiniz haklı bulunursa ödemenizin tamamı veya bir kısmı iade
              edilir.
            </>
          ),
        },
        {
          title: "Otomatik İadeler",
          body: "Aynı rezervasyon için birden fazla ödeme alınırsa fazla olan ödeme, iptal edilmiş bir rezervasyona ödeme yapılırsa o ödeme kendiliğinden iade edilir. Bunun için bir şey yapmanız gerekmez.",
        },
        {
          title: "İade Süresi ve Yöntemi",
          body: "İade, ödemenin yapıldığı karta yapılır ve iyzico üzerinden hemen gönderilir. Tutarın hesabınızda görünmesi bankanıza bağlı olarak 1–10 iş günü sürebilir. Ödeme altyapısı komisyonu sizden kesilmez; iade edilen tutar ödediğiniz tutarın tamamıdır.",
        },
        {
          title: "Yasal Haklarınız",
          body: "6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamındaki haklarınız saklıdır. Bu politika, yasal haklarınızı kısıtlamaz; yalnızca bunların ötesinde size tanıdığımız kolaylıkları açıklar.",
        },
      ]}
    />
  );
}
