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
    ["ai-other"],
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
  // Front-end only when the title has no back-end or full-stack side.
  [
    "Développeur Front-end React (H/F)",
    "Autre",
    ["frontend", "js", "swe"],
    ["fullstack"],
  ],
  ["Développeur Angular Senior", "Autre", ["frontend", "js"], []],
  [
    "Développeur Fullstack React / Node",
    "Autre",
    ["fullstack", "js", "swe"],
    ["frontend"],
  ],
  ["Développeur React Native", "Autre", ["mobile", "js"], ["frontend"]],
  [
    "Développeur Java Spring Boot / Angular",
    "Autre",
    ["java", "frontend", "js"],
    ["fullstack"],
  ],
  [
    "Développeur Fullstack H/F",
    "Développeur·euse Java (Kotlin, Groovy...)",
    ["fullstack", "java", "swe"],
    [],
  ],
  [
    "Développeur Backend Java (H/F)",
    "Autre",
    ["backend", "java", "swe"],
    ["fullstack"],
  ],
  ["Golang Backend Engineer", "Autre", ["backend", "go"], []],
  ["Développeur API H/F", "Autre", ["backend"], []],
  [
    "Développeur Back-end",
    "Développeur·euse PHP (Symfony, Laravel, Drupal...)",
    ["backend", "php"],
    [],
  ],
  ["Développeur Fullstack React / Node", "Autre", ["fullstack"], ["backend"]],
  // Embedded titles, in French or English, count with C and C++.
  ["Engineer Kernel Linux Embedded System H/F", "Autre", ["cpp"], []],
  ["Pilote Firmware (FW) (H/F)", "Autre", [], ["cpp"]],
  ["Ingénieur Firmware", "Autre", ["cpp"], []],
  ["Développeur C (full remote)", "Autre", ["cpp", "swe"], []],
  ["Développeur C # Finance WPF", "Autre", ["dotnet"], ["cpp"]],
  ["Développeur iOS Objective-C", "Autre", ["mobile"], ["cpp"]],
  ["Consultant tableau embedded", "Autre", [], ["cpp"]],
  // AI specialists apart from other roles that only mention AI.
  ["Data Scientist", "Data scientist", ["ai"], ["ai-other"]],
  ["AI Engineer – Copilot Studio", "Autre", ["ai"], ["ai-other"]],
  [
    "AI agent engineer / ingénieur IA générative & agents",
    "Autre",
    ["ai"],
    ["ai-other"],
  ],
  ["Développeur BIG DATA - ML OPS", "Autre", ["ai", "data-eng"], []],
  [
    "Développeur Python / IA Agentique (H/F)",
    "Autre",
    ["ai-other", "python"],
    ["ai"],
  ],
  [
    "Expert CyberSécurité Cloud & GenAI",
    "Autre",
    ["ai-other", "cyber"],
    ["ai"],
  ],
  [
    "Chef de projet sécurité IA",
    "Autre",
    ["ai-other", "project-manager"],
    ["ai"],
  ],
  // Roles outside development.
  [
    "Architecte Data / Data Platform Architect (H/F)",
    "Autre",
    ["architect"],
    [],
  ],
  ["Directeur de Projet Transverse H/F", "Autre", ["project-manager"], []],
  [
    "Chef de projet AMOA (H/F)",
    "Autre",
    ["project-manager", "business-analyst"],
    [],
  ],
  [
    "Business Analyst Risques de Marchés h/f",
    "Autre",
    ["business-analyst"],
    [],
  ],
  ["Consultant SAP BASIS S/4 - Paris", "Autre", ["sap"], []],
  [
    "Architecte SI - Expert Intégration ERP Oracle Fusion Cloud",
    "Autre",
    ["sap", "architect"],
    [],
  ],
  ["Ingénieur Data Analyst / BI", "Autre", ["data-analyst"], []],
  ["Consultant décisionnel BI", "Autre", ["data-analyst"], []],
  ["DBA Production PostgreSQL - MySQL - MariaDB", "Autre", ["dba"], []],
  [
    "Administrateur système et réseau Linux et Windows",
    "Autre",
    ["sysadmin"],
    [],
  ],
  ["Ingénieur Réseau h/f", "Autre", ["sysadmin"], []],
  ["Test Lead", "Autre", ["qa"], []],
  ["LEAD ANALYSTE DE TEST ET VALIDATION SAP", "Autre", ["qa", "sap"], []],
  [
    "Data Engineer GCP",
    "Autre",
    ["data-eng"],
    ["data-analyst", "business-analyst"],
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
