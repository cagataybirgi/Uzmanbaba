import type { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { AppError } from "../../errors.js";
import {
  toProfessionalDto,
  type ListProfessionalsResponse,
  type ProfessionalDto,
  type ProfessionalStatsDto,
} from "./professionals.dto.js";
import type { ListProfessionalsQuery } from "./professionals.schemas.js";

/* ─── list ────────────────────────────────────────────────────────────────── */

export async function listProfessionals(
  query: ListProfessionalsQuery,
): Promise<ListProfessionalsResponse> {
  const where = buildWhere(query);
  const orderBy = buildOrderBy(query.sort);
  const skip = (query.page - 1) * query.pageSize;

  // Count + page in parallel — they hit independent indexes.
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toProfessionalDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/* ─── featured ────────────────────────────────────────────────────────────── */

export async function listFeatured(limit = 3): Promise<ProfessionalDto[]> {
  const rows = await prisma.user.findMany({
    where: {
      accountType: "professional",
      emailVerified: true,
      available: true,
    },
    orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { reviewsCount: "desc" }],
    take: limit,
  });
  return rows.map(toProfessionalDto);
}

/* ─── public platform stats ─────────────────────────────────────────────── */

export async function getProfessionalStats(): Promise<ProfessionalStatsDto> {
  const where: Prisma.UserWhereInput = {
    accountType: "professional",
    emailVerified: true,
  };

  const [emailVerifiedProfessionals, locations, aggregate] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where: { ...where, location: { not: "" } },
      select: { location: true },
      distinct: ["location"],
    }),
    prisma.user.aggregate({
      where,
      _avg: { rating: true },
      _sum: { completedJobs: true },
    }),
  ]);

  // Locations are stored as "Ankara, TR". Normalizing the city prefix also
  // avoids double-counting legacy rows that may contain only "Ankara".
  const cities = new Set(
    locations
      .map(({ location }) => location.split(",")[0]?.trim())
      .filter((city): city is string => Boolean(city))
      .map((city) => city.toLocaleLowerCase("tr-TR"))
      .filter((city) => city !== "türkiye"),
  );

  return {
    emailVerifiedProfessionals,
    citiesServed: cities.size,
    averageRating:
      aggregate._avg.rating === null
        ? null
        : Number(aggregate._avg.rating.toFixed(2)),
    completedJobs: aggregate._sum.completedJobs ?? 0,
  };
}

/* ─── detail ──────────────────────────────────────────────────────────────── */

export async function getProfessional(id: string): Promise<ProfessionalDto> {
  const user = await prisma.user.findFirst({
    where: { id, accountType: "professional" },
  });
  if (!user) throw AppError.notFound("Uzman bulunamadı.");
  return toProfessionalDto(user);
}

/* ─── internals ───────────────────────────────────────────────────────────── */

function buildWhere(query: ListProfessionalsQuery): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    accountType: "professional",
    emailVerified: true,
  };

  // City filter — we store location as "Ankara, TR", so prefix-match the
  // city portion. `mode: insensitive` handles İ/i quirks without a
  // separate normalized column.
  if (query.city) {
    where.location = { startsWith: query.city, mode: "insensitive" };
  }

  // Text search — name OR specialty.
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { specialty: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ListProfessionalsQuery["sort"]): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [
        { rating: { sort: "desc", nulls: "last" } },
        { reviewsCount: "desc" },
      ];
    case "availability":
      return [
        { available: "desc" },
        { rating: { sort: "desc", nulls: "last" } },
      ];
    case "nearest":
      // Without geo data, "nearest" degrades to "rating" within the already-
      // filtered city. The frontend still shows the sort chip; users get
      // sensible results.
      return [
        { rating: { sort: "desc", nulls: "last" } },
        { reviewsCount: "desc" },
      ];
  }
}
