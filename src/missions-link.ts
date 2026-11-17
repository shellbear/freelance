// The wording of the links that lead from the rates pages to the missions page.
import type { OffersSummary } from "../pipeline/offers";

const number = new Intl.NumberFormat("fr-FR");
/** The statistics' "all offers" entry, which stands for the whole market. */
const MARKET = "all";

/** The link from a profile's rates to its open missions, naming how many once the count is known. */
export function missionsLink(
  profile: { id: string; label: string },
  summary: OffersSummary | null,
): { href: string; text: string } {
  if (profile.id === MARKET)
    return {
      href: "/missions",
      text: summary
        ? `Voir les ${number.format(summary.offers)} missions ouvertes →`
        : "Voir les missions ouvertes →",
    };
  const href = `/missions?profil=${profile.id}`;
  if (!summary)
    return { href, text: `Voir les missions ${profile.label} ouvertes →` };
  const count = summary.profiles[profile.id] ?? 0;
  if (count === 0)
    return {
      href: "/missions",
      text: `Aucune mission ${profile.label} ouverte aujourd'hui, voir les autres →`,
    };
  return {
    href,
    text:
      count === 1
        ? `Voir la mission ${profile.label} ouverte →`
        : `Voir les ${number.format(count)} missions ${profile.label} ouvertes →`,
  };
}

/** The announcement shown at the top of the rates pages. */
export function newsText(summary: OffersSummary | null): string {
  const what = summary
    ? `${number.format(summary.offers)} missions freelance ouvertes`
    : "Les missions freelance ouvertes";
  return `${what} aujourd'hui, avec leur TJM situé par rapport au marché →`;
}
