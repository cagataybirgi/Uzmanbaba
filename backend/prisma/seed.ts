import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

/**
 * Seeds six professionals matching the original mock list, so the search
 * and "featured" pages have data the moment the backend boots.
 *
 * Idempotent: re-running keeps the same UUIDs (deterministic by email)
 * and just updates fields. Safe to call repeatedly in dev.
 */

const prisma = new PrismaClient();

const AVATARS = {
  ahmet:
    "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  elif:
    "https://images.unsplash.com/photo-1574320200624-96b6e093f695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  mehmet:
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  selin:
    "https://images.unsplash.com/photo-1576323200687-e210fe495315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  kerem:
    "https://images.unsplash.com/photo-1661447133325-a4a73386b9e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  ayse:
    "https://images.unsplash.com/photo-1685475896056-8f5c6fb7e8a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
} as const;

interface ProSeed {
  email: string;
  name: string;
  specialty: string;
  city: string;
  rating: number;
  reviewsCount: number;
  available: boolean;
  avatar: string;
}

const PROS: ProSeed[] = [
  { email: "ahmet.yilmaz@uzmanbaba.dev",  name: "Ahmet Yılmaz",  specialty: "Sertifikalı Tesisatçı",   city: "Ankara",   rating: 4.9, reviewsCount: 214, available: true,  avatar: AVATARS.ahmet },
  { email: "elif.kaya@uzmanbaba.dev",     name: "Elif Kaya",     specialty: "Temizlik Uzmanı",         city: "Ankara",   rating: 4.8, reviewsCount: 178, available: true,  avatar: AVATARS.elif  },
  { email: "mehmet.demir@uzmanbaba.dev",  name: "Mehmet Demir",  specialty: "Elektrik Teknisyeni",     city: "İzmir",    rating: 4.7, reviewsCount: 132, available: false, avatar: AVATARS.mehmet },
  { email: "selin.arslan@uzmanbaba.dev",  name: "Selin Arslan",  specialty: "Boya & Badana Uzmanı",    city: "İstanbul", rating: 4.8, reviewsCount: 95,  available: true,  avatar: AVATARS.selin },
  { email: "kerem.celik@uzmanbaba.dev",   name: "Kerem Çelik",   specialty: "Marangoz & Usta",         city: "Bursa",    rating: 4.6, reviewsCount: 88,  available: true,  avatar: AVATARS.kerem },
  { email: "ayse.polat@uzmanbaba.dev",    name: "Ayşe Polat",    specialty: "Klima & Isıtma Uzmanı",   city: "Ankara",   rating: 4.9, reviewsCount: 201, available: true,  avatar: AVATARS.ayse  },
];

async function main() {
  // Shared dev password so it's easy to log in as any seeded user.
  const passwordHash = await bcrypt.hash("Password123!", 12);

  for (const p of PROS) {
    await prisma.user.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        specialty: p.specialty,
        location: `${p.city}, TR`,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        available: p.available,
        avatar: p.avatar,
      },
      create: {
        email: p.email,
        name: p.name,
        phone: "+90 555 000 00 00",
        passwordHash,
        accountType: "professional",
        emailVerified: true,
        specialty: p.specialty,
        location: `${p.city}, TR`,
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        available: p.available,
        avatar: p.avatar,
      },
    });
  }

  console.log(`[seed] upserted ${PROS.length} professionals`);
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
