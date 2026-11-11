// Sorts offers into categories from their title, falling back on Free-Work's job
// label. Skills are deliberately ignored: they mean "uses X", not "is an X job".

const NON_DEV_ROLE =
  /\b(chef de projet|business analyst|scrum|pmo|moa|amoa|support|technicien|ux|designer|recruteur|commercial|formateur|paiements?|messagerie|sepa|swift)\b/;
const BANKING = /\b(banque|bancaire|paiements?|messagerie|sepa)\b/;
// AI roles proper; other titles that merely mention AI have their own profile.
const AI_SPECIALIST =
  /data scien|machine learning|\bml\b|\bmlops\b|\bllm\b|\bnlp\b|computer vision|deep learning|\b(ai|ia|genai)\b[a-z ]{0,20}\b(engineer|scientist|researcher)\b|\bingenieure? (ia|ai)\b/;

/** A slice of a profile, tested on the normalized title in order: the first match wins. */
type Subgroup = {
  id: string;
  label: string;
  match: (title: string) => boolean;
};

type Category = {
  id: string;
  label: string;
  group: string;
  title: RegExp;
  search: string;
  job?: RegExp;
  not?: RegExp;
  umbrella?: boolean;
  subgroups?: Subgroup[];
};

const test = (pattern: RegExp) => (title: string) => pattern.test(title);
const IOS = /\bios\b|\bswift(ui)?\b/;
const ANDROID = /\bandroid\b|\bkotlin\b/;
const FRONT =
  /front[- ]?end|\b(react|reactjs|vue|vuejs|angular|angularjs|nextjs|next\.js)\b/;
const BACK = /back[- ]?end|\b(node|nodejs|node\.js|nestjs)\b/;
const CLOUDS = [/\baws\b|amazon web/, /\bazure\b/, /\bgcp\b|google cloud/];
const CLOUD_SUBGROUPS: Subgroup[] = [
  {
    id: "multi",
    label: "Multi-cloud",
    match: (t) => CLOUDS.filter((cloud) => cloud.test(t)).length > 1,
  },
  { id: "aws", label: "AWS", match: test(CLOUDS[0] as RegExp) },
  { id: "azure", label: "Azure", match: test(CLOUDS[1] as RegExp) },
  { id: "gcp", label: "GCP", match: test(CLOUDS[2] as RegExp) },
];

/** The first subgroup of a category matching a normalized title, or "other". */
export function subgroupOf(subgroups: Subgroup[], title: string) {
  return subgroups.find((subgroup) => subgroup.match(title))?.id ?? "other";
}

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
    id: "frontend",
    label: "Front-end",
    group: "Rôles",
    title:
      /front[- ]?end|\b(react|reactjs|vue|vuejs|vue\.js|angular|angularjs|nextjs|next\.js|svelte)\b/,
    // Full-stack, Node and React Native offers have their own profiles.
    not: /full[- ]?stack|back[- ]?end|\b(node|nodejs|node\.js|nestjs)\b|react[- ]?native/,
    job: /front-end/,
    search: "front-end",
    subgroups: [
      { id: "react", label: "React", match: test(/\breact(js)?\b|next\.?js/) },
      { id: "angular", label: "Angular", match: test(/\bangular(js)?\b/) },
      { id: "vue", label: "Vue", match: test(/\bvue(js|\.js)?\b|nuxt/) },
    ],
  },
  {
    id: "backend",
    label: "Back-end",
    group: "Rôles",
    title:
      /back[- ]?end|\bbackend\b|developpeur (api|serveur)|\bapi developer\b/,
    not: /full[- ]?stack|front[- ]?end/,
    // Says nothing about the language, so Free-Work's label can still name it.
    umbrella: true,
    search: "backend",
    subgroups: [
      {
        id: "java",
        label: "Java / Kotlin",
        match: test(/\bjava\b|\bspring\b|\bkotlin\b/),
      },
      {
        id: "dotnet",
        label: ".NET / C#",
        match: test(/\.net\b|\bc\s?#|\bdotnet\b/),
      },
      {
        id: "python",
        label: "Python",
        match: test(/\bpython\b|django|fastapi/),
      },
      {
        id: "node",
        label: "Node / TypeScript",
        match: test(/\bnode|nestjs|typescript|javascript/),
      },
      { id: "php", label: "PHP", match: test(/\bphp\b|symfony|laravel/) },
      { id: "go", label: "Go", match: test(/\bgolang\b|\bgo\b/) },
    ],
  },
  {
    id: "fullstack",
    label: "Full-stack",
    group: "Rôles",
    // Says nothing about the stack, so Free-Work's label can still name the language.
    umbrella: true,
    title: /full[- ]?stack/,
    job: /fullstack/,
    search: "fullstack",
  },
  {
    id: "architect",
    label: "Architecte",
    group: "Rôles",
    // Says nothing about the domain, so Free-Work's label can still name it.
    umbrella: true,
    title: /\barchitecte?s?\b|\barchitects?\b|\burbaniste\b/,
    search: "architecte",
  },
  {
    id: "project-manager",
    label: "Chef de projet / PMO",
    group: "Rôles",
    title:
      /chef(fe)? de projets?|project manager|\bpmo\b|direct(eur|rice) de (projet|programme)|program(me)? manager|delivery manager|\bproject lead\b/,
    search: "chef de projet",
  },
  {
    id: "business-analyst",
    label: "Business Analyst / AMOA",
    group: "Rôles",
    title:
      /business analyst|\bba\b|analyste (metier|fonctionnel)|\bamoa\b|\bmoa\b|consultant(e)? fonctionnel/,
    job: /business analyst|moa/,
    search: "business analyst",
  },
  {
    id: "sap",
    label: "SAP / ERP",
    group: "Rôles",
    title:
      /\bsap\b|\berp\b|s\/?4 ?hana|\bhana\b|\bd365\b|dynamics 365|\bworkday\b|\bodoo\b/,
    search: "SAP",
    subgroups: [
      { id: "sap", label: "SAP", match: test(/\bsap\b|s\/?4 ?hana|\bhana\b/) },
      { id: "erp", label: "Autres ERP", match: () => true },
    ],
  },
  {
    id: "qa",
    label: "QA / Test",
    group: "Rôles",
    title:
      /\bqa\b|testeur|testeuse|automaticien de test|test automation|\bsdet\b|test (lead|manager|engineer)|analyste (de )?tests?|ingenieure? (de )?tests?\b|responsable (de )?(la )?recette|\brecette\b/,
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
    subgroups: [
      {
        id: "web",
        label: "Web (Django, FastAPI, Flask)",
        match: test(/django|fastapi|flask/),
      },
      {
        id: "data",
        label: "Data / IA",
        match: test(/data|pyspark|\bia\b|\bai\b|\bml\b|machine learning|llm/),
      },
    ],
  },
  {
    id: "js",
    label: "JS / TS",
    group: "Langages",
    title:
      /\b(react|reactjs|vue|vuejs|vue\.js|angular|angularjs|node|nodejs|node\.js|nestjs|nextjs|next\.js|javascript|typescript|svelte)\b|front[- ]?end/,
    job: /front-end/,
    search: "javascript",
    subgroups: [
      {
        id: "react-native",
        label: "React Native",
        match: test(/react[- ]?native/),
      },
      {
        id: "fullstack",
        label: "Full-stack",
        match: (t) =>
          /full[- ]?stack/.test(t) || (FRONT.test(t) && BACK.test(t)),
      },
      { id: "frontend", label: "Front-end", match: test(FRONT) },
      { id: "node", label: "Node / back-end", match: test(BACK) },
    ],
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
    title: /\.net\b|\bc\s?#|\bdotnet\b/,
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
    label: "C / C++ / embarqué",
    group: "Langages",
    // A bare "C" only counts next to a developer title, and never as C# or Objective-C.
    title:
      /\bc\+\+|\bembarque|\bembedded\b|\bfirmware\b|\brtos\b|\byocto\b|\bmicrocontr|\b(developpeur|developpeuse|developer|dev|ingenieur|engineer|programmeur)\b[^,;]*(?<!objective-)\bc\b(?!\s*[#+])/,
    not: /\btableau\b|chef de projet|\bpilote\b/,
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
    subgroups: [
      { id: "flutter", label: "Flutter", match: test(/\bflutter\b/) },
      {
        id: "react-native",
        label: "React Native",
        match: test(/react[- ]?native/),
      },
      {
        id: "native",
        label: "iOS + Android",
        match: (t) => IOS.test(t) && ANDROID.test(t),
      },
      { id: "ios", label: "iOS", match: test(IOS) },
      { id: "android", label: "Android", match: test(ANDROID) },
    ],
  },
  {
    id: "devops",
    label: "DevOps / SRE",
    group: "Infra & sécurité",
    title:
      /\bdevops\b|\bsre\b|site reliability|platform engineer|ingenieur (de )?plateforme/,
    job: /devops/,
    search: "devops",
    subgroups: [
      ...CLOUD_SUBGROUPS,
      {
        id: "kubernetes",
        label: "Kubernetes / OpenShift",
        match: test(/kubernetes|\bk8s\b|openshift/),
      },
    ],
  },
  {
    id: "sysadmin",
    label: "Système & réseau",
    group: "Infra & sécurité",
    title:
      /administrat(eur|rice) (systemes?|reseaux?|infrastructures?|linux|windows|unix)|\bsysadmin\b|ingenieure? (systemes?|reseaux?|infrastructures?|de production|production|linux|windows)\b|\b(network|systems?) (engineer|administrator)\b|technicien(ne)? (systemes?|reseaux?)|\bexploitation\b/,
    job: /ingenieure? de production|administrateur(rice)? (systeme|reseau)/,
    search: "administrateur système",
  },
  {
    id: "cloud",
    label: "Cloud",
    group: "Infra & sécurité",
    title: /architecte.*cloud|cloud.*architect|ingenieur cloud|cloud engineer/,
    job: /architecte cloud/,
    search: "cloud",
    subgroups: CLOUD_SUBGROUPS,
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
    subgroups: [
      {
        id: "soc",
        label: "SOC / CERT",
        match: test(
          /\bsoc\b|\bsiem\b|\bcsirt\b|\bcert\b|incident|threat|\bedr\b/,
        ),
      },
      {
        id: "iam",
        label: "IAM",
        match: test(/\biam\b|\biag\b|identit|habilitation|\bpam\b/),
      },
      {
        id: "grc",
        label: "GRC / RSSI",
        match: test(
          /\brssi\b|\bgrc\b|gouvernance|conformite|iso ?27001|risques?|\baudit|\bciso\b|\bdora\b|\bnis ?2\b/,
        ),
      },
      { id: "architecture", label: "Architecture", match: test(/architect/) },
    ],
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
    subgroups: [
      { id: "databricks", label: "Databricks", match: test(/databricks/) },
      { id: "snowflake", label: "Snowflake", match: test(/snowflake/) },
      {
        id: "gcp",
        label: "GCP / BigQuery",
        match: test(/\bgcp\b|bigquery|google cloud/),
      },
      {
        id: "azure",
        label: "Azure (Data Factory, Fabric…)",
        match: test(/\bazure\b|data factory|\bfabric\b|synapse/),
      },
      {
        id: "spark",
        label: "Spark / Hadoop",
        match: test(/\bspark\b|pyspark|hadoop|scala/),
      },
    ],
  },
  {
    id: "ai",
    label: "IA / Data Science",
    subgroups: [
      {
        id: "genai",
        label: "LLM / IA générative",
        match: test(/\bllm\b|genai|generative|\bagent|\brag\b|prompt/),
      },
      { id: "mlops", label: "MLOps", match: test(/mlops|ml ?ops/) },
      {
        id: "data-scientist",
        label: "Data scientist",
        match: test(/data scien/),
      },
      {
        id: "ml",
        label: "ML engineer",
        match: test(
          /machine learning|\bml\b|deep learning|computer vision|\bnlp\b/,
        ),
      },
    ],
    group: "Data & IA",
    title: AI_SPECIALIST,
    job: /data scientist/,
    search: "data scientist",
  },
  {
    id: "ai-other",
    label: "IA (autres métiers)",
    group: "Data & IA",
    title: /\bia\b|\bai\b|intelligence artificielle|genai|agenti(c|que)/,
    not: AI_SPECIALIST,
    search: "IA",
  },
  {
    id: "data-analyst",
    label: "Data Analyst / BI",
    group: "Data & IA",
    title:
      /data analyst|analyste (de |des )?donnees|\bbi\b|business intelligence|power ?bi|\bqlik|\bdecisionnel|\bdataviz|\btableau\b/,
    job: /data analyst/,
    search: "data analyst",
  },
  {
    id: "dba",
    label: "DBA",
    group: "Data & IA",
    title:
      /\bdba\b|database administrator|administrat(eur|rice) (de |des )?bases? de donnees|administrat(eur|rice) (oracle|sql server|postgres)/,
    search: "DBA",
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
