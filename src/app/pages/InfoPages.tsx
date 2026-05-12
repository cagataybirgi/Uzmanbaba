import { Link } from "react-router";
import {
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  Shield,
  FileText,
  Users,
  Heart,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { ReactNode, ComponentType } from "react";

/* ─────────────────────────────────────────────────────────────────────────
 * Shared layout
 * ──────────────────────────────────────────────────────────────────────── */

interface InfoLayoutProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  children: ReactNode;
}

function InfoLayout({ eyebrow, title, lead, children }: InfoLayoutProps) {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-50 via-white to-orange-50 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-4">
          {eyebrow && (
            <div className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              {eyebrow}
            </div>
          )}
          <h1 className="text-gray-900 text-3xl sm:text-4xl font-extrabold leading-tight">
            {title}
          </h1>
          {lead && (
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl">
              {lead}
            </p>
          )}
        </div>
      </section>

      {/* Body */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">{children}</div>
      </section>
    </>
  );
}

interface CardProps {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: ReactNode;
}

function Card({ icon: Icon, title, children }: CardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0">
            <Icon size={18} />
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-lg mb-2">{title}</h2>
          <div className="text-gray-600 text-sm leading-relaxed flex flex-col gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderNote() {
  return (
    <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
      <p>
        Bu sayfanın içeriği şu anda örnek metindir ve yakında resmi içerikle
        güncellenecektir.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * About
 * ──────────────────────────────────────────────────────────────────────── */

export function About() {
  return (
    <InfoLayout
      eyebrow="Hakkımızda"
      title="Baba sorunu çözer."
      lead="UzmanBaba, Türkiye'nin her köşesinden doğrulanmış uzmanları, yerel hizmete ihtiyacı olan ailelerle buluşturur."
    >
      <Card icon={Heart} title="Misyonumuz">
        <p>
          Ev tamiratından temizliğe, nakliyattan elektrik işlerine kadar günlük
          hayatın işlerini tek bir güvenli platformda topluyoruz. Amacımız,
          aradığınız uzmana dakikalar içinde, güvenle ulaşmanızı sağlamak.
        </p>
      </Card>

      <Card icon={Shield} title="Güven Önceliğimiz">
        <p>
          Platformumuzdaki her uzman kimlik ve belge doğrulamasından geçer.
          Müşteri yorumları gerçek rezervasyonlardan toplanır. Ödemeleriniz iş
          tamamlanana kadar güvenle bekletilir.
        </p>
      </Card>

      <Card icon={Users} title="Topluluğumuz">
        <p>
          Binlerce uzman ve onbinlerce müşteri, UzmanBaba topluluğunun bir
          parçası. Hem hizmet alan hem de hizmet veren için adil, şeffaf bir
          deneyim sunmak için çalışıyoruz.
        </p>
      </Card>

      <PlaceholderNote />
    </InfoLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Support
 * ──────────────────────────────────────────────────────────────────────── */

export function Support() {
  return (
    <InfoLayout
      eyebrow="Destek"
      title="Yardımcı olalım"
      lead="Hesabınız, rezervasyonunuz veya ödemenizle ilgili her türlü sorunuz için buradayız."
    >
      <Card icon={MessageCircle} title="Sıkça Sorulan Sorular">
        <p>Müşterilerimizden en sık aldığımız soruların yanıtlarını bir araya getirdik.</p>
        <ul className="list-disc pl-5 flex flex-col gap-2 text-gray-700">
          <li>Rezervasyonumu nasıl iptal edebilirim?</li>
          <li>Ödeme ne zaman uzmana aktarılır?</li>
          <li>Memnun kalmazsam ne yapmalıyım?</li>
          <li>Uzman olmak için nasıl başvurabilirim?</li>
        </ul>
      </Card>

      <Card icon={Clock} title="Yanıt Sürelerimiz">
        <p>
          E-posta ile ulaşan sorular için ortalama yanıt süremiz{" "}
          <strong className="text-gray-900">2 saat</strong>. Acil durumlar için
          telefon hattımızı kullanabilirsiniz.
        </p>
      </Card>

      <Card icon={Mail} title="Bize Ulaşın">
        <p>
          Sorununuzun çözümünü aşağıda bulamadıysanız,{" "}
          <Link
            to="/iletisim"
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            İletişim sayfamız
          </Link>{" "}
          üzerinden bize doğrudan yazabilirsiniz.
        </p>
      </Card>

      <PlaceholderNote />
    </InfoLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Contact
 * ──────────────────────────────────────────────────────────────────────── */

export function Contact() {
  const items = [
    {
      icon: Mail,
      label: "E-posta",
      value: "destek@uzmanbaba.com",
      href: "mailto:destek@uzmanbaba.com",
    },
    {
      icon: Phone,
      label: "Telefon",
      value: "+90 850 000 00 00",
      href: "tel:+908500000000",
    },
    {
      icon: MapPin,
      label: "Adres",
      value: "İstanbul, Türkiye",
      href: null,
    },
  ];

  return (
    <InfoLayout
      eyebrow="İletişim"
      title="Bize ulaşın"
      lead="Sorularınız, geri bildirimleriniz ve iş birliği teklifleriniz için bekliyoruz."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(({ icon: Icon, label, value, href }) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-2 items-start"
          >
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
              <Icon size={16} />
            </div>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
            {href ? (
              <a
                href={href}
                className="text-sm font-semibold text-gray-900 hover:text-orange-500 transition-colors break-all"
              >
                {value}
              </a>
            ) : (
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            )}
          </div>
        ))}
      </div>

      <Card title="Çalışma Saatlerimiz">
        <p>
          Pazartesi – Cuma:{" "}
          <strong className="text-gray-900">09:00 – 18:00</strong>
          <br />
          Hafta sonu: Acil destek hattı 24/7 açıktır.
        </p>
      </Card>

      <PlaceholderNote />
    </InfoLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Terms
 * ──────────────────────────────────────────────────────────────────────── */

export function Terms() {
  return (
    <InfoLayout
      eyebrow="Yasal"
      title="Kullanım Şartları"
      lead="UzmanBaba'yı kullanırken geçerli olan kurallar ve koşullar."
    >
      <Card icon={FileText} title="Hizmet Kullanımı">
        <p>
          UzmanBaba'yı kullanarak bu şartları kabul etmiş sayılırsınız.
          Platformumuzu yalnızca yasalara uygun, gerçek hizmet ihtiyaçları için
          kullanmanız gerekir.
        </p>
      </Card>

      <Card icon={Users} title="Kullanıcı Sorumlulukları">
        <p>
          Hesap bilgilerinizin güvenliğinden siz sorumlusunuz. Yanıltıcı bilgi
          paylaşımı, sahte değerlendirme yazma veya platform dışında ödeme talep
          etme yasaktır.
        </p>
      </Card>

      <Card icon={Sparkles} title="Hizmet Garantisi">
        <p>
          Platform üzerinden yapılan rezervasyonlar memnuniyet garantisi
          kapsamındadır. Detaylı şartlar her hizmet kategorisine göre değişebilir.
        </p>
      </Card>

      <p className="text-xs text-gray-400 text-center mt-2">
        Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
      </p>

      <PlaceholderNote />
    </InfoLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Privacy
 * ──────────────────────────────────────────────────────────────────────── */

export function Privacy() {
  return (
    <InfoLayout
      eyebrow="Gizlilik"
      title="Gizlilik Politikası"
      lead="Verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuz hakkında."
    >
      <Card icon={Shield} title="Veri Toplama">
        <p>
          Yalnızca hizmet sunumu için gerekli olan bilgileri (ad, e-posta,
          telefon, adres) topluyoruz. Bilgileriniz KVKK kapsamında korunur.
        </p>
      </Card>

      <Card icon={FileText} title="Veri Kullanımı">
        <p>
          Bilgileriniz; rezervasyon yönetimi, uzmanla iletişim ve hizmet
          kalitesini artırma amaçlarıyla kullanılır. Üçüncü taraflara
          satılmaz veya pazarlama amacıyla paylaşılmaz.
        </p>
      </Card>

      <Card icon={Heart} title="Haklarınız">
        <p>
          Verilerinize her zaman erişebilir, düzenleyebilir veya silinmesini
          talep edebilirsiniz. Bunun için{" "}
          <Link
            to="/iletisim"
            className="text-orange-500 hover:text-orange-600 font-semibold"
          >
            iletişim sayfamızdan
          </Link>{" "}
          bize ulaşmanız yeterli.
        </p>
      </Card>

      <p className="text-xs text-gray-400 text-center mt-2">
        Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
      </p>

      <PlaceholderNote />

      {/* Back-to-home CTA shared across all info pages */}
      <div className="text-center mt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 text-sm font-medium"
        >
          Ana Sayfaya Dön <ArrowRight size={14} />
        </Link>
      </div>
    </InfoLayout>
  );
}
