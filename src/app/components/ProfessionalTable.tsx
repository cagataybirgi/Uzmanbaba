import { Link } from "react-router";
import { Button, Photo, Table, Tag, Td, TdName, Th } from "./ds";
import type { Professional } from "../data/professionals";

/* ═══════════════════════════════════════════════════════════════════════════
 * ProfessionalTable — the listing surface for professionals.
 *
 * The system lists people in a ruled table, not in cards: name, service,
 * location, rating, availability and the one action. Below 768px each row
 * restacks into a labelled record (see .data-table in styles/components.css)
 * so the same markup stays readable on a phone.
 * ═════════════════════════════════════════════════════════════════════════ */

function ratingLabel(pro: Professional): string {
  const rating = Number.isFinite(pro.rating) ? pro.rating : 0;
  return `${rating.toFixed(1).replace(".", ",")} (${pro.reviews})`;
}

export function ProfessionalTable({
  professionals,
  onBook,
  caption,
}: {
  professionals: Professional[];
  onBook: (professional: Professional) => void;
  caption: string;
}) {
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          <Th className="w-14">
            <span className="sr-only">Fotoğraf</span>
          </Th>
          <Th>Uzman</Th>
          <Th>Hizmet</Th>
          <Th>Konum</Th>
          <Th>Puan</Th>
          <Th>Durum</Th>
          <Th className="w-px">
            <span className="sr-only">İşlem</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {professionals.map((pro) => (
          <tr key={pro.id}>
            <Td cell="media">
              <Photo src={pro.avatar} name={pro.name} alt="" size={40} />
            </Td>

            <TdName label="Uzman">
              <Link
                to={`/professionals/${encodeURIComponent(pro.id)}`}
                className="text-ink no-underline transition-colors hover:text-brand-800"
              >
                {pro.name}
              </Link>
            </TdName>

            <Td label="Hizmet">{pro.title}</Td>

            <Td label="Konum" className="text-ink/70">
              {pro.location}
            </Td>

            <Td label="Puan" className="tnum">
              {ratingLabel(pro)}
            </Td>

            <Td label="Durum">
              <Tag tone={pro.available ? "accent" : "neutral"}>
                {pro.available ? "Bugün Müsait" : "Dolu"}
              </Tag>
            </Td>

            <Td cell="actions">
              <Button
                variant="secondary"
                onClick={() => onBook(pro)}
                aria-label={`${pro.name} için rezervasyon oluştur`}
              >
                Rezerve Et
              </Button>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
