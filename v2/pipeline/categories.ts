// Sorts offers into categories from their title, falling back on Free-Work's job
// label. Skills are deliberately ignored: they mean "uses X", not "is an X job".

const NON_DEV_ROLE =
  /\b(chef de projet|business analyst|scrum|pmo|moa|amoa|support|technicien|ux|designer|recruteur|commercial|formateur|paiements?|messagerie|sepa|swift)\b/;
const BANKING = /\b(banque|bancaire|paiements?|messagerie|sepa)\b/;

type Category = {
  id: string;
  label: string;
  group: string;
  title: RegExp;
  search: string;
  job?: RegExp;
  not?: RegExp;
  umbrella?: boolean;
};

export const CATEGORIES: Category[] = [
  {
    id: "swe",
    label: "Software Engineer",
    group: "Rôles",
    umbrella: true,
    title:
      /\b(dev|devs|developpeur|developpeuse|developer|software engineer|ingenieur logiciel|ingenieur developpement|programmeur)\b|full[- ]?stack|back[- ]?end|front[- ]?end/,
    job: /^developpeur|lead developer|analyste programmeur/,
    search: "développeur",
  },
  {
    id: "tech-lead",
    label: "Tech Lead",
    group: "Rôles",
    title: /tech[- ]?lead|lead dev|lead tech|lead engineer/,
    search: "tech lead",
  },
  {
    id: "qa",
    label: "QA / Test",
    group: "Rôles",
    title: /\bqa\b|testeur|automaticien de test|test automation|\bsdet\b/,
    job: /testeur/,
    search: "QA",
  },
  {
    id: "product",
    label: "Product",
    group: "Rôles",
    title: /product owner|\bpo\b|product manager|chef de produit/,
    search: "product owner",
  },
  {
    id: "python",
    label: "Python",
    group: "Langages",
    title: /\bpython\b|\bdjango\b|\bfastapi\b|\bpyspark\b/,
    job: /developpeur(euse)? python/,
    search: "python",
  },
  {
    id: "js",
    label: "JS / TS",
    group: "Langages",
    title:
      /\b(react|reactjs|vue|vuejs|vue\.js|angular|angularjs|node|nodejs|node\.js|nestjs|nextjs|next\.js|javascript|typescript)\b|front[- ]?end/,
    job: /front-end/,
    search: "javascript",
  },
  {
    id: "java",
    label: "Java / Kotlin",
    group: "Langages",
    title: /\bjava\b|\bkotlin\b|\bspring\b|\bj2ee\b|\bjee\b/,
    job: /developpeur(euse)? java/,
    search: "java",
  },
  {
    id: "go",
    label: "Go",
    group: "Langages",
    title:
      /\bgolang\b|\b(dev|developpeur|developer|engineer|ingenieur|backend|back-end|architecte)\b[^,;]*\bgo\b(?![- ]*(live|to|no)\b)|\bgo\s+(dev|developer|engineer)/,
    search: "golang",
  },
  {
    id: "rust",
    label: "Rust",
    group: "Langages",
    title: /\brust\b/,
    search: "rust",
  },
  {
    id: "dotnet",
    label: ".NET / C#",
    group: "Langages",
    title: /\.net\b|\bc#|\bdotnet\b/,
    job: /\.net/,
    search: ".net",
  },
  {
    id: "php",
    label: "PHP",
    group: "Langages",
    title: /\bphp\b|\bsymfony\b|\blaravel\b/,
    job: /developpeur(euse)? php/,
    search: "php",
  },
  {
    id: "cpp",
    label: "C / C++",
    group: "Langages",
    title: /\bc\+\+|\bembarque/,
    job: /embarque/,
    search: "c++",
  },
  {
    id: "mobile",
    label: "Mobile",
    group: "Langages",
    title:
      /\b(ios|android|flutter|swiftui|react[- ]?native)\b|\b(developpeur|developer|dev|ingenieur|engineer|lead)\b[^,;]*\b(mobile|swift)\b|\bmobile\b[^,;]*\b(developpeur|developer|engineer)\b/,
    not: BANKING,
    job: /mobile/,
    search: "mobile",
  },
  {
    id: "devops",
    label: "DevOps / SRE",
    group: "Infra & sécurité",
    title:
      /\bdevops\b|\bsre\b|site reliability|platform engineer|ingenieur (de )?plateforme/,
    job: /devops/,
    search: "devops",
  },
  {
    id: "cloud",
    label: "Cloud",
    group: "Infra & sécurité",
    title: /architecte.*cloud|cloud.*architect|ingenieur cloud|cloud engineer/,
    job: /architecte cloud/,
    search: "cloud",
  },
  {
    id: "devsecops",
    label: "DevSecOps / AppSec",
    group: "Infra & sécurité",
    title: /devsecops|appsec|securite applicative/,
    job: /devsecops/,
    search: "devsecops",
  },
  {
    id: "cyber",
    label: "Cybersécurité",
    group: "Infra & sécurité",
    title:
      /cyber|\brssi\b|\bsoc\b|\bsiem\b|\biam\b|securite (des|du|si|informatique|operationnelle|reseau)|ingenieur securite|security/,
    job: /cybersecurite|administrateur(rice)? securite|\brssi\b/,
    search: "cybersécurité",
  },
  {
    id: "pentest",
    label: "Pentest",
    group: "Infra & sécurité",
    title: /pentest|pen[- ]test|tests? d.intrusion|red ?team|ethical hack/,
    search: "pentest",
  },
  {
    id: "data-eng",
    label: "Data Engineer",
    group: "Data & IA",
    title:
      /data engineer|ingenieur data|\betl\b|databricks|\bspark\b|dataops|big data|developpeur data/,
    search: "data engineer",
  },
  {
    id: "ai",
    label: "Data Science / IA",
    group: "Data & IA",
    title:
      /data scien|machine learning|\bml\b|\bmlops\b|\bllm\b|\bia\b|\bai\b|genai|intelligence artificielle/,
    job: /data scientist/,
    search: "IA",
  },
];

export const normalize = (text: string | null | undefined) =>
  (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/·/g, "");

/** Returns the id of every category an offer belongs to (an offer can be in several). */
export function classify(title: string, job: string | null): string[] {
  const t = normalize(title);
  const j = normalize(job);
  const fromTitle = CATEGORIES.filter(
    (c) => c.title.test(t) && !c.not?.test(t),
  );
  // Free-Work's label is often wrong, so it only speaks when the title says nothing specific.
  const specific = fromTitle.some((c) => !c.umbrella);
  const fromLabel =
    specific || NON_DEV_ROLE.test(t)
      ? []
      : CATEGORIES.filter((c) => c.job?.test(j) && !c.not?.test(t));
  return [...new Set([...fromTitle, ...fromLabel].map((c) => c.id))];
}
