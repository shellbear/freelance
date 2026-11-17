import { expect, test } from "bun:test";
import { missionsLink, newsText } from "./missions-link";

const SUMMARY = {
  generatedAt: "2026-11-17T07:00:00.000Z",
  offers: 7928,
  profiles: { go: 18, rust: 1 },
};
const go = { id: "go", label: "Go" };

test("missionsLink names how many missions a profile has open", () => {
  expect(missionsLink(go, SUMMARY)).toEqual({
    href: "/missions?profil=go",
    text: "Voir les 18 missions Go ouvertes →",
  });
  expect(missionsLink({ id: "rust", label: "Rust" }, SUMMARY)).toEqual({
    href: "/missions?profil=rust",
    text: "Voir la mission Rust ouverte →",
  });
});

test("missionsLink covers the whole market for the market view", () => {
  expect(
    missionsLink({ id: "all", label: "Toutes les offres" }, SUMMARY),
  ).toEqual({ href: "/missions", text: "Voir les 7 928 missions ouvertes →" });
});

test("missionsLink points to every mission when the profile has none open", () => {
  expect(missionsLink({ id: "pentest", label: "Pentest" }, SUMMARY)).toEqual({
    href: "/missions",
    text: "Aucune mission Pentest ouverte aujourd'hui, voir les autres →",
  });
});

test("missionsLink works before the counts are known", () => {
  expect(missionsLink(go, null)).toEqual({
    href: "/missions?profil=go",
    text: "Voir les missions Go ouvertes →",
  });
  expect(missionsLink({ id: "all", label: "Toutes les offres" }, null)).toEqual(
    { href: "/missions", text: "Voir les missions ouvertes →" },
  );
});

test("newsText announces the missions page, with the count once known", () => {
  expect(newsText(null)).toBe(
    "Les missions freelance ouvertes aujourd'hui, avec leur TJM situé par rapport au marché →",
  );
  expect(newsText(SUMMARY)).toBe(
    "7 928 missions freelance ouvertes aujourd'hui, avec leur TJM situé par rapport au marché →",
  );
});
