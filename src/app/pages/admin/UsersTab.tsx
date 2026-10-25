import { useState } from "react";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
  Table,
  Tag,
  Td,
  TdName,
  Th,
} from "../../components/ds";
import { useAdminUsers } from "../../data/admin";
import { FilterBar, formatDateTime, Pager, SearchBox } from "./shared";

type Filter = "all" | "customer" | "professional";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "customer", label: "Müşteriler" },
  { id: "professional", label: "Uzmanlar" },
];

export function UsersTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const users = useAdminUsers({
    page,
    q: q || undefined,
    accountType: filter === "all" ? undefined : filter,
  });
  const data = users.data;

  return (
    <>
      <h1 className="t-panel mb-10">Kullanıcılar</h1>

      <div className="mb-5">
        <SearchBox
          value={q}
          placeholder="Ad veya e-posta ara"
          onSearch={(next) => {
            setQ(next);
            setPage(1);
          }}
        />
      </div>
      <div className="mb-7 border-b-2 border-rule">
        <FilterBar
          label="Hesap türüne göre filtrele"
          value={filter}
          options={FILTERS}
          onChange={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
      </div>

      {users.error ? (
        <ErrorState message={users.error} onRetry={users.refetch} />
      ) : !data ? (
        <SkeletonRows rows={5} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Kullanıcı yok" description="Bu aramayla eşleşen kullanıcı bulunamadı." />
      ) : (
        <>
          <Table caption="Kullanıcılar">
            <thead>
              <tr>
                <Th>Ad</Th>
                <Th>İletişim</Th>
                <Th>Tür</Th>
                <Th>Konum</Th>
                <Th>Rezervasyon</Th>
                <Th>Katıldı</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id}>
                  <TdName label="Ad">
                    {u.name}
                    {u.specialty && (
                      <span className="block font-sans text-xs font-normal text-ink/60">
                        {u.specialty}
                      </span>
                    )}
                  </TdName>
                  <Td label="İletişim" className="break-words">
                    {u.email}
                    {u.phone && <span className="block text-xs text-ink/60">{u.phone}</span>}
                  </Td>
                  <Td label="Tür">
                    <span className="inline-flex flex-wrap gap-1.5">
                      <Tag tone={u.accountType === "professional" ? "accent" : "neutral"}>
                        {u.accountType === "professional" ? "Uzman" : "Müşteri"}
                      </Tag>
                      {u.isAdmin && <Tag tone="outline">Yönetici</Tag>}
                      {!u.emailVerified && <Tag tone="danger">E-posta doğrulanmadı</Tag>}
                    </span>
                  </Td>
                  <Td label="Konum">{u.location || "—"}</Td>
                  <Td label="Rezervasyon" className="tnum">
                    {u.bookingsCount}
                  </Td>
                  <Td label="Katıldı" className="tnum">
                    {formatDateTime(u.createdAt)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  );
}
