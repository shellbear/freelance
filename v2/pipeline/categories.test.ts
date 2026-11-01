import { expect, test } from "bun:test";
import { classify } from "./categories";

const cases: [
  title: string,
  job: string,
  expected: string[],
  forbidden: string[],
][] = [
  // Real titles from the data, including the traps found while testing the rules.
  [
    "Développeur Golang Fullstack",
    "Développeur·euse fullstack",
    ["go", "swe"],
    [],
  ],
  ["Dev Golang Rest API (au moins 3 ans d'exp)", "Autre", ["go"], []],
  ["Architecte GO REACT", "Architecte technique", ["go", "js"], []],
  ["Chef de projet Go Live SAP", "Autre", [], ["go"]],
  ["Ingénieur go-live ERP", "Autre", [], ["go"]],
  [
    "Golang Backend Engineer",
    "Développeur·euse data (décisionnel)",
    ["go", "swe"],
    ["data-eng"],
  ],
  [
    "Business Analyst Paiements – SWIFT / SEPA (H/F)",
    "Business analyst",
    [],
    ["mobile"],
  ],
  ["EXPERT SWIFT", "Développeur·euse mobile iOS (Swift)", [], ["mobile"]],
  ["Ingénieur Intégration SWIFT - Banque", "Autre", [], ["mobile"]],
  [
    "Développeur iOS Senior – Swift / SwiftUI",
    "Développeur·euse mobile iOS (Swift)",
    ["mobile", "swe"],
    [],
  ],
  ["Développeur Swift", "Autre", ["mobile", "swe"], []],
  [
    "Développeur Android - Kotlin (h/f)",
    "Développeur·euse mobile Android",
    ["mobile", "java", "swe"],
    [],
  ],
  ["Pentester Senior", "Autre", ["pentest"], []],
  [
    "Architecte Sécurité (H/F)",
    "Administrateur·rice sécurité",
    ["cyber"],
    ["pentest"],
  ],
  [
    "Ingénieur DevSecOps - (H/F)",
    "Développeur·euse sécurité (devsecops)",
    ["devsecops"],
    ["devops"],
  ],
  ["Ingénieur DevOps Sénior H/F", "Ingénieur·e devops (Cloud)", ["devops"], []],
  // A specific title overrides a wrong label.
  [
    "Développeur Java / Spring Boot – Vannes",
    "Ingénieur·e devops (Cloud)",
    ["java", "swe"],
    ["devops"],
  ],
  [
    "Expert IA Générative",
    "Expert·e / Consultant·e SEO (référencement)",
    ["ai"],
    [],
  ],
  [
    "Product Owner Senior - Salesforce Marketing Cloud",
    "Ingénieur·e devops (Cloud)",
    ["product"],
    ["devops"],
  ],
  // An offer can sit in several categories.
  [
    "Développeur Fullstack Java / Angular",
    "Développeur·euse Java (Kotlin, Groovy...)",
    ["java", "js", "swe"],
    [],
  ],
  // The label fills in when the title is vague, unless the role is clearly not development.
  ["Consultant senior (H/F)", "Développeur·euse Python", ["python", "swe"], []],
  ["Chef de projet senior", "Développeur·euse Python", [], ["python", "swe"]],
  // Nothing to do with these categories.
  ["Business Analyst H/F", "Business analyst", [], ["swe", "python"]],
  ["Gouvernance des données", "Autre", [], ["go", "java"]],
];

for (const [title, job, expected, forbidden] of cases) {
  test(`${title} [${job}]`, () => {
    const got = classify(title, job);
    for (const id of expected) expect(got).toContain(id);
    for (const id of forbidden) expect(got).not.toContain(id);
  });
}
