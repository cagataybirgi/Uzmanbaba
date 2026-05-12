import type { Professional } from "../app/components/ProfessionalCard";

/* ─────────────────────────────────────────────────────────────────────────
 * Types
 *
 * Booking-related types live here because they describe this file's data.
 * `Professional` is owned by ProfessionalCard.tsx — we just import it.
 * ──────────────────────────────────────────────────────────────────────── */

export type BookingStatus = "confirmed" | "completed" | "pending" | "cancelled";

export interface Booking {
  id: number;
  professional: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
  price: string;
  avatar: string;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Avatars
 *
 * Centralized so each face has exactly one URL. Pros and bookings both
 * reference these by key — change a URL here and it updates everywhere.
 * `as const` gives us literal types on the values.
 * ──────────────────────────────────────────────────────────────────────── */

const AVATARS = {
  ahmet:
    "https://images.unsplash.com/photo-1649769069590-268b0b994462?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwcGx1bWJlciUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3M3ww&ixlib=rb-4.1.0&q=80&w=400",
  elif:
    "https://images.unsplash.com/photo-1574320200624-96b6e093f695?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBjbGVhbmluZyUyMHByb2Zlc3Npb25hbCUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3M3ww&ixlib=rb-4.1.0&q=80&w=400",
  mehmet:
    "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZWxlY3RyaWNpYW4lMjB3b3JrZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Nzg1ODE4NzN8MA&ixlib=rb-4.1.0&q=80&w=400",
  selin:
    "https://images.unsplash.com/photo-1576323200687-e210fe495315?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBwYWludGVyJTIwY29udHJhY3RvciUyMHBvcnRyYWl0fGVufDF8fHx8MTc3ODU4MTg3Nnww&ixlib=rb-4.1.0&q=80&w=400",
  kerem:
    "https://images.unsplash.com/photo-1661447133325-a4a73386b9e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwaGFuZHltYW4lMjBjYXJwZW50ZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3Nzg1ODE4NzZ8MA&ixlib=rb-4.1.0&q=80&w=400",
  ayse:
    "https://images.unsplash.com/photo-1685475896056-8f5c6fb7e8a7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBwcm9mZXNzaW9uYWwlMjB0ZWNobmljaWFuJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzc4NTgxODc2fDA&ixlib=rb-4.1.0&q=80&w=400",
} as const;

/* ─────────────────────────────────────────────────────────────────────────
 * Professionals — the canonical list
 *
 * Note on Elif Kaya: previously listed in Ankara in SearchResults but in
 * İstanbul in Home. Standardized on Ankara (matched the fuller list).
 * ──────────────────────────────────────────────────────────────────────── */

export const PROFESSIONALS: Professional[] = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    title: "Sertifikalı Tesisatçı",
    location: "Ankara, TR",
    rating: 4.9,
    reviews: 214,
    available: true,
    avatar: AVATARS.ahmet,
  },
  {
    id: 2,
    name: "Elif Kaya",
    title: "Temizlik Uzmanı",
    location: "Ankara, TR",
    rating: 4.8,
    reviews: 178,
    available: true,
    avatar: AVATARS.elif,
  },
  {
    id: 3,
    name: "Mehmet Demir",
    title: "Elektrik Teknisyeni",
    location: "İzmir, TR",
    rating: 4.7,
    reviews: 132,
    available: false,
    avatar: AVATARS.mehmet,
  },
  {
    id: 4,
    name: "Selin Arslan",
    title: "Boya & Badana Uzmanı",
    location: "İstanbul, TR",
    rating: 4.8,
    reviews: 95,
    available: true,
    avatar: AVATARS.selin,
  },
  {
    id: 5,
    name: "Kerem Çelik",
    title: "Marangoz & Usta",
    location: "Bursa, TR",
    rating: 4.6,
    reviews: 88,
    available: true,
    avatar: AVATARS.kerem,
  },
  {
    id: 6,
    name: "Ayşe Polat",
    title: "Klima & Isıtma Uzmanı",
    location: "Ankara, TR",
    rating: 4.9,
    reviews: 201,
    available: true,
    avatar: AVATARS.ayse,
  },
];

/**
 * First 3 entries from PROFESSIONALS. Derived so the home page's featured
 * list stays in sync when the canonical list is reordered or extended.
 */
export const FEATURED_PROFESSIONALS: Professional[] = PROFESSIONALS.slice(0, 3);

/* ─────────────────────────────────────────────────────────────────────────
 * Bookings — sample data shown on Dashboard
 * ──────────────────────────────────────────────────────────────────────── */

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 1,
    professional: "Ahmet Yılmaz",
    service: "Tesisat Tamiri",
    date: "14 May 2026",
    time: "10:00",
    status: "confirmed",
    price: "₺450",
    avatar: AVATARS.ahmet,
  },
  {
    id: 2,
    professional: "Elif Kaya",
    service: "Ev Temizliği",
    date: "12 May 2026",
    time: "14:00",
    status: "completed",
    price: "₺320",
    avatar: AVATARS.elif,
  },
  {
    id: 3,
    professional: "Mehmet Demir",
    service: "Elektrik Tesisatı",
    date: "8 May 2026",
    time: "09:00",
    status: "completed",
    price: "₺600",
    avatar: AVATARS.mehmet,
  },
  {
    id: 4,
    professional: "Selin Arslan",
    service: "Boya Badana",
    date: "3 May 2026",
    time: "11:00",
    status: "cancelled",
    price: "₺750",
    avatar: AVATARS.selin,
  },
  {
    id: 5,
    professional: "Kerem Çelik",
    service: "Marangoz İşi",
    date: "18 May 2026",
    time: "15:00",
    status: "pending",
    price: "₺520",
    avatar: AVATARS.kerem,
  },
  {
    id: 6,
    professional: "Ayşe Polat",
    service: "Klima Bakımı",
    date: "20 May 2026",
    time: "13:00",
    status: "confirmed",
    price: "₺380",
    avatar: AVATARS.ayse,
  },
];
