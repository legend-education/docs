#!/usr/bin/env node
/**
 * Scaffold Common Core ELA + Math standards pages.
 *
 * Each generated page includes:
 *   - Full SEO frontmatter (title, sidebarTitle, description, keywords,
 *     OG/Twitter, canonical, robots, author/publisher/last_updated)
 *   - H1 phrased as a teacher search query
 *   - Answer-box primitive (TODO content)
 *   - BreadcrumbList + LearningResource JSON-LD
 *   - DefinedTermSet JSON-LD on per-domain pages
 *   - "What it covers", Standards table, Classroom application, FAQ,
 *     Related pages, Citation block, Canonical summary primitives
 *
 * Existing files are skipped unless the --force flag is passed, so this
 * is safe to re-run as the page tree grows.
 *
 * Usage:
 *   node scripts/scaffold-ccss.mjs            (skip existing)
 *   node scripts/scaffold-ccss.mjs --force    (overwrite)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const force = process.argv.includes("--force");

const SITE = "https://standards.legend.org";
const PUBLISHER = "Common Core State Standards Initiative";
const PUBLISHER_URL = "https://www.corestandards.org/";
const TODAY = "2026-05-06";

/* ------------------------------------------------------------------ */
/* helpers                                                            */
/* ------------------------------------------------------------------ */

function frontmatter(meta) {
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (Array.isArray(v)) {
      lines.push(`${quoteKey(k)}: [${v.map((x) => JSON.stringify(x)).join(", ")}]`);
    } else {
      lines.push(`${quoteKey(k)}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

function quoteKey(k) {
  return /[:\\.\\-]/.test(k) ? `"${k}"` : k;
}

function jsonLd(obj) {
  return [
    "<script type=\"application/ld+json\">{`",
    JSON.stringify(obj, null, 2),
    "`}</script>",
    "",
  ].join("\n");
}

function breadcrumb(crumbs) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE}${c.path}`,
    })),
  });
}

function learningResource({ name, urlPath, level, audience = "teacher" }) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name,
    url: `${SITE}${urlPath}`,
    inLanguage: "en",
    educationalLevel: level,
    learningResourceType: "Standards reference",
    audience: { "@type": "EducationalAudience", educationalRole: audience },
    publisher: { "@type": "Organization", name: PUBLISHER, url: PUBLISHER_URL },
    dateModified: TODAY,
  });
}

// The Official Source citation block used to live here. Mintlify's MDX
// renderer strips the inner <dl>/<dt>/<dd>, which leaves an empty
// "Official source" box on every rendered page. Until we have a primitive
// that survives the renderer, scaffolding skips this block.
function citation(_url = PUBLISHER_URL) {
  return "";
}

function answerBox(text) {
  return [`<div class="answer-box">`, text, `</div>`, ""].join("\n");
}

function canonicalSummary(text) {
  return [
    `<div class="canonical-summary">`,
    text,
    `</div>`,
    "",
  ].join("\n");
}

function bodyForGrade({ title, urlPath, gradeLabel, related, todoAnswer, todoSummary, breadcrumbs, what }) {
  return [
    `# ${title}`,
    "",
    answerBox(todoAnswer),
    breadcrumb(breadcrumbs),
    learningResource({ name: title, urlPath, level: gradeLabel }),
    "## What it covers",
    "",
    what.map((b) => `- ${b}`).join("\n"),
    "",
    "## Standards",
    "",
    `<table class="standards-table">`,
    `  <thead>`,
    `    <tr>`,
    `      <th>Code</th>`,
    `      <th>Official text</th>`,
    `      <th>Plain meaning</th>`,
    `      <th>Student skill</th>`,
    `      <th>Example</th>`,
    `    </tr>`,
    `  </thead>`,
    `  <tbody>`,
    `    <tr>`,
    `      <td>TBD</td>`,
    `      <td>TODO official wording</td>`,
    `      <td>TODO plain meaning</td>`,
    `      <td>TODO student skill</td>`,
    `      <td>TODO classroom example</td>`,
    `    </tr>`,
    `  </tbody>`,
    `</table>`,
    "",
    "## Classroom application",
    "",
    "TODO: how teachers use these standards for lesson planning, rubrics, feedback, and assessment.",
    "",
    "## Common teacher questions",
    "",
    `<AccordionGroup>`,
    `  <Accordion title="What does this look like in a real assignment?">`,
    `    TODO: concrete example.`,
    `  </Accordion>`,
    `  <Accordion title="How is this assessed on state tests?">`,
    `    TODO: concrete example.`,
    `  </Accordion>`,
    `</AccordionGroup>`,
    "",
    "## Related pages",
    "",
    related.map((r) => `- [${r.label}](${r.path})`).join("\n"),
    "",
    citation(),
    canonicalSummary(todoSummary),
  ].join("\n");
}

async function writeFileSafe(relPath, contents) {
  const abs = path.join(root, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  if (!force) {
    try {
      await fs.access(abs);
      return { wrote: false, abs };
    } catch {}
  }
  await fs.writeFile(abs, contents, "utf8");
  return { wrote: true, abs };
}

async function deleteIfExists(relPath) {
  const abs = path.join(root, relPath);
  try {
    await fs.unlink(abs);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* page metadata                                                       */
/* ------------------------------------------------------------------ */

function fmFor({ title, sidebarTitle, description, keywords, urlPath, ogTitle }) {
  return frontmatter({
    title,
    sidebarTitle,
    description,
    keywords,
    "og:title": ogTitle ?? title,
    "og:description": description,
    "og:image": "/og/default.png",
    "twitter:card": "summary_large_image",
    canonical: `${SITE}${urlPath}`,
    robots: "index,follow,max-snippet:-1,max-image-preview:large",
    author: "Legend Standards Editorial",
    publisher: PUBLISHER,
    publisher_url: PUBLISHER_URL,
    last_updated: TODAY,
  });
}

/* ------------------------------------------------------------------ */
/* ELA tree                                                            */
/* ------------------------------------------------------------------ */

const ELA_ANCHOR_STRANDS = [
  { slug: "reading", label: "Reading", count: 10 },
  { slug: "writing", label: "Writing", count: 10 },
  { slug: "speaking-listening", label: "Speaking & Listening", count: 6 },
  { slug: "language", label: "Language", count: 6 },
];

const ELA_GRADES_K5 = [
  { slug: "kindergarten", label: "Kindergarten", code: "K" },
  { slug: "grade-1", label: "Grade 1", code: "1" },
  { slug: "grade-2", label: "Grade 2", code: "2" },
  { slug: "grade-3", label: "Grade 3", code: "3" },
  { slug: "grade-4", label: "Grade 4", code: "4" },
  { slug: "grade-5", label: "Grade 5", code: "5" },
];

const ELA_GRADES_68 = [
  { slug: "grade-6", label: "Grade 6", code: "6" },
  { slug: "grade-7", label: "Grade 7", code: "7" },
  { slug: "grade-8", label: "Grade 8", code: "8" },
];

const ELA_BANDS_HS = [
  { slug: "grades-9-10", label: "Grades 9-10", code: "9-10" },
  { slug: "grades-11-12", label: "Grades 11-12", code: "11-12" },
];

const ELA_GRADE_LIST = [...ELA_GRADES_K5, ...ELA_GRADES_68, ...ELA_BANDS_HS];

const ELA_LITERACY = [
  { hub: "literacy-history-social-studies", label: "Literacy in History/Social Studies" },
  { hub: "literacy-science-technical", label: "Literacy in Science & Technical Subjects" },
];
const ELA_LITERACY_BANDS = [
  { slug: "grades-6-8", label: "Grades 6-8" },
  { slug: "grades-9-10", label: "Grades 9-10" },
  { slug: "grades-11-12", label: "Grades 11-12" },
];

/* ------------------------------------------------------------------ */
/* Math tree                                                           */
/* ------------------------------------------------------------------ */

const MATH_PRACTICE = [
  { slug: "mp1", num: 1, label: "Make sense of problems and persevere in solving them" },
  { slug: "mp2", num: 2, label: "Reason abstractly and quantitatively" },
  { slug: "mp3", num: 3, label: "Construct viable arguments and critique the reasoning of others" },
  { slug: "mp4", num: 4, label: "Model with mathematics" },
  { slug: "mp5", num: 5, label: "Use appropriate tools strategically" },
  { slug: "mp6", num: 6, label: "Attend to precision" },
  { slug: "mp7", num: 7, label: "Look for and make use of structure" },
  { slug: "mp8", num: 8, label: "Look for and express regularity in repeated reasoning" },
];

const MATH_GRADES = [
  {
    slug: "kindergarten",
    label: "Kindergarten",
    code: "K",
    domains: [
      { slug: "counting-cardinality", label: "Counting & Cardinality" },
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-1",
    label: "Grade 1",
    code: "1",
    domains: [
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-2",
    label: "Grade 2",
    code: "2",
    domains: [
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-3",
    label: "Grade 3",
    code: "3",
    domains: [
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "number-fractions", label: "Number & Operations — Fractions" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-4",
    label: "Grade 4",
    code: "4",
    domains: [
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "number-fractions", label: "Number & Operations — Fractions" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-5",
    label: "Grade 5",
    code: "5",
    domains: [
      { slug: "operations-algebraic-thinking", label: "Operations & Algebraic Thinking" },
      { slug: "number-base-ten", label: "Number & Operations in Base Ten" },
      { slug: "number-fractions", label: "Number & Operations — Fractions" },
      { slug: "measurement-data", label: "Measurement & Data" },
      { slug: "geometry", label: "Geometry" },
    ],
  },
  {
    slug: "grade-6",
    label: "Grade 6",
    code: "6",
    domains: [
      { slug: "ratios-proportional-relationships", label: "Ratios & Proportional Relationships" },
      { slug: "number-system", label: "The Number System" },
      { slug: "expressions-equations", label: "Expressions & Equations" },
      { slug: "geometry", label: "Geometry" },
      { slug: "statistics-probability", label: "Statistics & Probability" },
    ],
  },
  {
    slug: "grade-7",
    label: "Grade 7",
    code: "7",
    domains: [
      { slug: "ratios-proportional-relationships", label: "Ratios & Proportional Relationships" },
      { slug: "number-system", label: "The Number System" },
      { slug: "expressions-equations", label: "Expressions & Equations" },
      { slug: "geometry", label: "Geometry" },
      { slug: "statistics-probability", label: "Statistics & Probability" },
    ],
  },
  {
    slug: "grade-8",
    label: "Grade 8",
    code: "8",
    domains: [
      { slug: "number-system", label: "The Number System" },
      { slug: "expressions-equations", label: "Expressions & Equations" },
      { slug: "functions", label: "Functions" },
      { slug: "geometry", label: "Geometry" },
      { slug: "statistics-probability", label: "Statistics & Probability" },
    ],
  },
];

const MATH_HS = [
  { slug: "number-quantity", label: "Number & Quantity" },
  { slug: "algebra", label: "Algebra" },
  { slug: "functions", label: "Functions" },
  { slug: "modeling", label: "Modeling" },
  { slug: "geometry", label: "Geometry" },
  { slug: "statistics-probability", label: "Statistics & Probability" },
];

/* ------------------------------------------------------------------ */
/* page generators                                                     */
/* ------------------------------------------------------------------ */

const pages = [];

/* Common Core hub --------------------------------------------------- */
pages.push({
  rel: "standards/common-core/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core";
    const title = "Common Core State Standards (CCSS) guide";
    return (
      fmFor({
        title,
        sidebarTitle: "Overview",
        description:
          "What the Common Core State Standards are, what they cover in ELA and Math, and where to find every standard with a teacher-friendly explanation.",
        keywords: ["Common Core", "CCSS", "ELA standards", "math standards"],
        urlPath,
      }) +
      "# What are the Common Core State Standards?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary of CCSS adoption, the two subjects (ELA and Math), and how the grade-level structure works.",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
      ]) +
      learningResource({ name: title, urlPath, level: "K-12" }) +
      "## What it covers\n\n" +
      "- **English Language Arts**: Reading, Writing, Speaking & Listening, Language\n" +
      "- **Mathematics**: 8 Standards for Mathematical Practice plus K-12 content standards\n" +
      "- Grade-by-grade structure for K-8, banded standards for 9-10 and 11-12\n\n" +
      "## Subjects\n\n" +
      "<CardGroup cols={2}>\n" +
      `  <Card title="ELA" icon="book-open-text" href="/standards/common-core/ela">Reading, Writing, Speaking & Listening, Language across K-12.</Card>\n` +
      `  <Card title="Mathematics" icon="calculator" href="/standards/common-core/math">Practice standards plus K-12 content standards.</Card>\n` +
      "</CardGroup>\n\n" +
      citation() +
      canonicalSummary(
        "TODO: 60–100 word canonical summary of CCSS for LLM extraction. Include adoption status, the two subjects, and the official source URL.",
      )
    );
  },
});

/* ELA hub ----------------------------------------------------------- */
pages.push({
  rel: "standards/common-core/ela/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core/ela";
    const title = "Common Core ELA standards — full K-12 directory";
    return (
      fmFor({
        title,
        sidebarTitle: "Overview",
        description:
          "Every Common Core English Language Arts standard from kindergarten through grade 12, organized by anchor strand, grade, and content-area literacy.",
        keywords: ["Common Core ELA", "CCSS ELA", "reading standards", "writing standards"],
        urlPath,
      }) +
      "# What are the Common Core ELA standards?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary covering the four ELA strands (Reading, Writing, Speaking & Listening, Language), grade structure (K-5 grade-by-grade, 6-8 grade-by-grade, 9-12 in two bands), and the literacy-in-content-areas extensions for grades 6-12.",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
        { name: "ELA", path: urlPath },
      ]) +
      learningResource({ name: title, urlPath, level: "K-12" }) +
      "## Strands\n\n" +
      "- **Reading** — Literature and Informational Text\n" +
      "- **Writing** — Argument, Informative/Explanatory, Narrative\n" +
      "- **Speaking & Listening** — Comprehension, Collaboration, Presentation\n" +
      "- **Language** — Conventions, Knowledge of Language, Vocabulary\n\n" +
      "## Browse by anchor strand\n\n" +
      "<CardGroup cols={2}>\n" +
      ELA_ANCHOR_STRANDS.map(
        (s) =>
          `  <Card title="${s.label}" href="/standards/common-core/ela/anchor/${s.slug}">CCRA.${s.label[0]} anchor standards across all grades.</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      "## Browse by grade\n\n" +
      "<CardGroup cols={3}>\n" +
      ELA_GRADE_LIST.map(
        (g) =>
          `  <Card title="${g.label}" href="/standards/common-core/ela/${g.slug}">${g.label} ELA standards.</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      "## Literacy in content areas (Grades 6-12)\n\n" +
      "<CardGroup cols={2}>\n" +
      `  <Card title="History/Social Studies" href="/standards/common-core/ela/literacy-history-social-studies/grades-6-8">RH and WHST standards.</Card>\n` +
      `  <Card title="Science & Technical Subjects" href="/standards/common-core/ela/literacy-science-technical/grades-6-8">RST and WHST standards.</Card>\n` +
      "</CardGroup>\n\n" +
      citation("https://www.corestandards.org/ELA-Literacy/") +
      canonicalSummary(
        "TODO: 60–100 word extractable summary describing ELA scope, four strands, grade structure, and the literacy extensions.",
      )
    );
  },
});

/* ELA anchor hub --------------------------------------------------- */
pages.push({
  rel: "standards/common-core/ela/anchor/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core/ela/anchor";
    const title = "Common Core ELA Anchor Standards (CCR)";
    return (
      fmFor({
        title,
        sidebarTitle: "Anchor overview",
        description:
          "The College and Career Readiness (CCR) Anchor Standards are the cross-grade backbone of Common Core ELA. 32 anchors define what students should know by the end of 12th grade.",
        keywords: ["CCR anchor standards", "anchor reading", "anchor writing", "CCRA"],
        urlPath,
      }) +
      "# What are the Common Core ELA Anchor Standards?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary explaining that the CCR Anchor Standards (CCRA) are the K-12 spine of Common Core ELA. Each grade-level standard maps to one anchor; together they define college and career readiness in reading, writing, speaking & listening, and language.",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
        { name: "ELA", path: "/standards/common-core/ela" },
        { name: "Anchor", path: urlPath },
      ]) +
      learningResource({ name: title, urlPath, level: "K-12" }) +
      "## The four anchor strands\n\n" +
      "<CardGroup cols={2}>\n" +
      ELA_ANCHOR_STRANDS.map(
        (s) =>
          `  <Card title="${s.label} (${s.count})" href="/standards/common-core/ela/anchor/${s.slug}">CCRA.${s.label[0]}.1–${s.count}</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      citation("https://www.corestandards.org/ELA-Literacy/CCRA/") +
      canonicalSummary("TODO: 60–100 word extractable summary of the CCR Anchor Standards.")
    );
  },
});

/* ELA anchor pages -------------------------------------------------- */
for (const s of ELA_ANCHOR_STRANDS) {
  pages.push({
    rel: `standards/common-core/ela/anchor/${s.slug}.mdx`,
    data: () => {
      const urlPath = `/standards/common-core/ela/anchor/${s.slug}`;
      const title = `Common Core ELA Anchor Standards — ${s.label} (CCRA.${s.label[0]})`;
      return (
        fmFor({
          title,
          sidebarTitle: s.label,
          description: `All ${s.count} College and Career Readiness anchor standards for ${s.label.toLowerCase()}, with explanations and classroom examples for K-12 teachers.`,
          keywords: [
            "Common Core",
            `${s.label} anchor standards`,
            `CCRA.${s.label[0]}`,
            `anchor ${s.label.toLowerCase()}`,
          ],
          urlPath,
        }) +
        `# What are the Common Core ${s.label} anchor standards?\n\n` +
        answerBox(
          `TODO: 50–80 word simple summary covering all ${s.count} CCRA.${s.label[0]} anchors and how grade-level standards map to them.`,
        ) +
        breadcrumb([
          { name: "Standards", path: "/standards" },
          { name: "Common Core", path: "/standards/common-core" },
          { name: "ELA", path: "/standards/common-core/ela" },
          { name: "Anchor", path: "/standards/common-core/ela/anchor" },
          { name: s.label, path: urlPath },
        ]) +
        learningResource({ name: title, urlPath, level: "K-12" }) +
        `## What it covers\n\n${Array.from({ length: s.count }, (_, i) => `- CCRA.${s.label[0]}.${i + 1} — TODO summary`).join("\n")}\n\n` +
        "## Standards\n\n" +
        `<table class="standards-table">\n` +
        `  <thead><tr><th>Code</th><th>Official text</th><th>Plain meaning</th><th>Student skill</th><th>Maps to</th></tr></thead>\n` +
        `  <tbody>\n` +
        Array.from(
          { length: s.count },
          (_, i) =>
            `    <tr><td>CCRA.${s.label[0]}.${i + 1}</td><td>TODO</td><td>TODO</td><td>TODO</td><td>K-12 grade-level ${s.slug.split("-")[0]}.${i + 1}</td></tr>`,
        ).join("\n") +
        `\n  </tbody>\n</table>\n\n` +
        "## Classroom application\n\nTODO\n\n" +
        "## Related pages\n\n" +
        `- [ELA hub](/standards/common-core/ela)\n` +
        `- [Anchor overview](/standards/common-core/ela/anchor)\n` +
        ELA_ANCHOR_STRANDS.filter((x) => x.slug !== s.slug)
          .map((x) => `- [${x.label} anchor](/standards/common-core/ela/anchor/${x.slug})`)
          .join("\n") +
        "\n\n" +
        citation(`https://www.corestandards.org/ELA-Literacy/CCRA/${s.label[0]}/`) +
        canonicalSummary(`TODO: 60–100 word extractable summary of the ${s.label} anchor strand.`)
      );
    },
  });
}

/* ELA grade pages --------------------------------------------------- */
for (let i = 0; i < ELA_GRADE_LIST.length; i++) {
  const g = ELA_GRADE_LIST[i];
  const prev = i > 0 ? ELA_GRADE_LIST[i - 1] : null;
  const next = i < ELA_GRADE_LIST.length - 1 ? ELA_GRADE_LIST[i + 1] : null;
  pages.push({
    rel: `standards/common-core/ela/${g.slug}/index.mdx`,
    data: () => {
      const urlPath = `/standards/common-core/ela/${g.slug}`;
      const title = `Common Core ELA standards for ${g.label}`;
      const related = [
        ...(prev ? [{ label: `${prev.label} ELA`, path: `/standards/common-core/ela/${prev.slug}` }] : []),
        ...(next ? [{ label: `${next.label} ELA`, path: `/standards/common-core/ela/${next.slug}` }] : []),
        { label: "Reading anchor", path: "/standards/common-core/ela/anchor/reading" },
        { label: "Writing anchor", path: "/standards/common-core/ela/anchor/writing" },
        { label: "ELA hub", path: "/standards/common-core/ela" },
      ];
      const what = ["Reading — Literature and Informational Text", "Writing — Argument, Informative/Explanatory, Narrative", "Speaking & Listening", "Language"];
      if (Number(g.code) <= 5 || g.code === "K") what.unshift("Reading Foundational Skills (K-5 only)");
      return (
        fmFor({
          title,
          sidebarTitle: g.label,
          description: `All Common Core ELA standards for ${g.label}: reading, writing, speaking & listening, and language. Explanations, classroom examples, and citations.`,
          keywords: [
            "Common Core",
            `${g.label} ELA`,
            `Grade ${g.code} writing`,
            `Grade ${g.code} reading`,
          ],
          urlPath,
        }) +
        bodyForGrade({
          title: `What are the Common Core ELA standards for ${g.label}?`,
          urlPath,
          gradeLabel: g.label,
          related,
          breadcrumbs: [
            { name: "Standards", path: "/standards" },
            { name: "Common Core", path: "/standards/common-core" },
            { name: "ELA", path: "/standards/common-core/ela" },
            { name: g.label, path: urlPath },
          ],
          what,
          todoAnswer: `TODO: 50–80 word simple summary of the ${g.label} ELA standards.`,
          todoSummary: `TODO: 60–100 word extractable summary of ${g.label} ELA expectations.`,
        })
      );
    },
  });
}

/* ELA literacy pages ----------------------------------------------- */
for (const hub of ELA_LITERACY) {
  for (const b of ELA_LITERACY_BANDS) {
    pages.push({
      rel: `standards/common-core/ela/${hub.hub}/${b.slug}.mdx`,
      data: () => {
        const urlPath = `/standards/common-core/ela/${hub.hub}/${b.slug}`;
        const title = `${hub.label} — ${b.label}`;
        return (
          fmFor({
            title,
            sidebarTitle: b.label,
            description: `Common Core ${hub.label} standards for ${b.label}, with explanations and classroom examples.`,
            keywords: ["Common Core", hub.label, `${b.label} literacy`],
            urlPath,
          }) +
          `# What are the Common Core ${hub.label} standards for ${b.label}?\n\n` +
          answerBox(`TODO: 50–80 word simple summary for ${hub.label} at ${b.label}.`) +
          breadcrumb([
            { name: "Standards", path: "/standards" },
            { name: "Common Core", path: "/standards/common-core" },
            { name: "ELA", path: "/standards/common-core/ela" },
            { name: hub.label, path: `/standards/common-core/ela/${hub.hub}/${ELA_LITERACY_BANDS[0].slug}` },
            { name: b.label, path: urlPath },
          ]) +
          learningResource({ name: title, urlPath, level: b.label }) +
          "## What it covers\n\n- Reading in this discipline\n- Writing in this discipline\n\n" +
          "## Related pages\n\n" +
          ELA_LITERACY_BANDS.filter((x) => x.slug !== b.slug)
            .map((x) => `- [${hub.label} ${x.label}](/standards/common-core/ela/${hub.hub}/${x.slug})`)
            .join("\n") +
          `\n- [ELA hub](/standards/common-core/ela)\n\n` +
          citation(`https://www.corestandards.org/ELA-Literacy/${hub.hub === "literacy-history-social-studies" ? "RH" : "RST"}/${b.slug.replace("grades-", "").replace("-", "/")}/`) +
          canonicalSummary(`TODO: 60–100 word extractable summary of ${hub.label} ${b.label}.`)
        );
      },
    });
  }
}

/* Math hub ---------------------------------------------------------- */
pages.push({
  rel: "standards/common-core/math/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core/math";
    const title = "Common Core Mathematics standards — full K-12 directory";
    return (
      fmFor({
        title,
        sidebarTitle: "Overview",
        description:
          "Every Common Core Math standard from kindergarten through high school, organized by Standards for Mathematical Practice, grade-level domains, and high school conceptual categories.",
        keywords: ["Common Core math", "CCSS math", "math standards", "Standards for Mathematical Practice"],
        urlPath,
      }) +
      "# What are the Common Core Math standards?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary explaining the two parts of CCSS Math: 8 Standards for Mathematical Practice (cross-grade) and content standards (K-8 grade-by-grade plus high school by conceptual category).",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
        { name: "Math", path: urlPath },
      ]) +
      learningResource({ name: title, urlPath, level: "K-12" }) +
      "## How CCSS Math is organized\n\n" +
      "1. **Standards for Mathematical Practice** — 8 habits of mind that apply across all grades.\n" +
      "2. **K-8 content standards** — grade-by-grade, organized into domains.\n" +
      "3. **High school content standards** — organized into 6 conceptual categories.\n\n" +
      "## Browse\n\n" +
      "<CardGroup cols={2}>\n" +
      `  <Card title="Practice standards" href="/standards/common-core/math/practice">All 8 Standards for Mathematical Practice (MP1-MP8).</Card>\n` +
      `  <Card title="High school" href="/standards/common-core/math/high-school">Number & Quantity, Algebra, Functions, Modeling, Geometry, Statistics & Probability.</Card>\n` +
      "</CardGroup>\n\n" +
      "## Browse by grade\n\n" +
      "<CardGroup cols={3}>\n" +
      MATH_GRADES.map(
        (g) =>
          `  <Card title="${g.label}" href="/standards/common-core/math/${g.slug}">${g.label} math standards.</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      citation("https://www.corestandards.org/Math/") +
      canonicalSummary("TODO: 60–100 word extractable summary of CCSS Math.")
    );
  },
});

/* Math practice hub ------------------------------------------------- */
pages.push({
  rel: "standards/common-core/math/practice/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core/math/practice";
    const title = "Standards for Mathematical Practice (MP1-MP8)";
    return (
      fmFor({
        title,
        sidebarTitle: "Practice overview",
        description:
          "The 8 Standards for Mathematical Practice describe the habits of mind students develop K-12 in Common Core Math.",
        keywords: ["Standards for Mathematical Practice", "MP1", "MP3", "math practices"],
        urlPath,
      }) +
      "# What are the Standards for Mathematical Practice?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary explaining MP1-MP8 as the cross-grade habits of mind in Common Core Math.",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
        { name: "Math", path: "/standards/common-core/math" },
        { name: "Practice", path: urlPath },
      ]) +
      learningResource({ name: title, urlPath, level: "K-12" }) +
      "## The 8 practice standards\n\n" +
      "<CardGroup cols={2}>\n" +
      MATH_PRACTICE.map(
        (mp) =>
          `  <Card title="MP${mp.num}" href="/standards/common-core/math/practice/${mp.slug}">${mp.label}</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      citation("https://www.corestandards.org/Math/Practice/") +
      canonicalSummary("TODO: 60–100 word extractable summary of MP1-MP8.")
    );
  },
});

/* Math practice pages ---------------------------------------------- */
for (let i = 0; i < MATH_PRACTICE.length; i++) {
  const mp = MATH_PRACTICE[i];
  const prev = i > 0 ? MATH_PRACTICE[i - 1] : null;
  const next = i < MATH_PRACTICE.length - 1 ? MATH_PRACTICE[i + 1] : null;
  pages.push({
    rel: `standards/common-core/math/practice/${mp.slug}.mdx`,
    data: () => {
      const urlPath = `/standards/common-core/math/practice/${mp.slug}`;
      const title = `MP${mp.num}: ${mp.label}`;
      return (
        fmFor({
          title,
          sidebarTitle: `MP${mp.num}`,
          description: `What MP${mp.num} (${mp.label.toLowerCase()}) means, with classroom examples and rubric language for K-12 teachers.`,
          keywords: [`MP${mp.num}`, "Standards for Mathematical Practice", mp.label],
          urlPath,
        }) +
        `# What does Mathematical Practice ${mp.num} (MP${mp.num}) mean?\n\n` +
        answerBox(`TODO: 50–80 word simple summary explaining MP${mp.num}: ${mp.label}.`) +
        breadcrumb([
          { name: "Standards", path: "/standards" },
          { name: "Common Core", path: "/standards/common-core" },
          { name: "Math", path: "/standards/common-core/math" },
          { name: "Practice", path: "/standards/common-core/math/practice" },
          { name: `MP${mp.num}`, path: urlPath },
        ]) +
        jsonLd({
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: `MP${mp.num}`,
          alternateName: mp.label,
          description: `Standards for Mathematical Practice ${mp.num} of the Common Core State Standards.`,
          inDefinedTermSet: `${SITE}/standards/common-core/math/practice`,
          url: `${SITE}${urlPath}`,
        }) +
        learningResource({ name: title, urlPath, level: "K-12" }) +
        "## What it means\n\nTODO: explanation.\n\n" +
        "## Classroom application\n\nTODO: how teachers see MP" + mp.num + " in student work.\n\n" +
        "## Related pages\n\n" +
        (prev ? `- [Previous: MP${prev.num}](/standards/common-core/math/practice/${prev.slug})\n` : "") +
        (next ? `- [Next: MP${next.num}](/standards/common-core/math/practice/${next.slug})\n` : "") +
        `- [Practice overview](/standards/common-core/math/practice)\n` +
        `- [Math hub](/standards/common-core/math)\n\n` +
        citation("https://www.corestandards.org/Math/Practice/") +
        canonicalSummary(`TODO: 60–100 word extractable summary of MP${mp.num}.`)
      );
    },
  });
}

/* Math grade pages -------------------------------------------------- */
for (let gi = 0; gi < MATH_GRADES.length; gi++) {
  const g = MATH_GRADES[gi];
  const prev = gi > 0 ? MATH_GRADES[gi - 1] : null;
  const next = gi < MATH_GRADES.length - 1 ? MATH_GRADES[gi + 1] : null;

  /* grade index */
  pages.push({
    rel: `standards/common-core/math/${g.slug}/index.mdx`,
    data: () => {
      const urlPath = `/standards/common-core/math/${g.slug}`;
      const title = `Common Core Math standards for ${g.label}`;
      return (
        fmFor({
          title,
          sidebarTitle: g.label,
          description: `All Common Core Math standards for ${g.label} across ${g.domains.length} domains, with explanations and classroom examples.`,
          keywords: ["Common Core math", `${g.label} math`, `Grade ${g.code} math`],
          urlPath,
        }) +
        `# What are the Common Core Math standards for ${g.label}?\n\n` +
        answerBox(
          `TODO: 50–80 word simple summary of ${g.label} math expectations across ${g.domains.length} domains.`,
        ) +
        breadcrumb([
          { name: "Standards", path: "/standards" },
          { name: "Common Core", path: "/standards/common-core" },
          { name: "Math", path: "/standards/common-core/math" },
          { name: g.label, path: urlPath },
        ]) +
        learningResource({ name: title, urlPath, level: g.label }) +
        "## Domains in this grade\n\n" +
        "<CardGroup cols={2}>\n" +
        g.domains
          .map(
            (d) =>
              `  <Card title="${d.label}" href="/standards/common-core/math/${g.slug}/${d.slug}">${g.label} ${d.label} standards.</Card>`,
          )
          .join("\n") +
        "\n</CardGroup>\n\n" +
        "## Related pages\n\n" +
        (prev ? `- [${prev.label} math](/standards/common-core/math/${prev.slug})\n` : "") +
        (next ? `- [${next.label} math](/standards/common-core/math/${next.slug})\n` : "") +
        `- [Practice standards](/standards/common-core/math/practice)\n` +
        `- [Math hub](/standards/common-core/math)\n\n` +
        citation(`https://www.corestandards.org/Math/Content/${g.code}/introduction/`) +
        canonicalSummary(`TODO: 60–100 word extractable summary of ${g.label} math.`)
      );
    },
  });

  /* per-domain pages */
  for (const d of g.domains) {
    pages.push({
      rel: `standards/common-core/math/${g.slug}/${d.slug}.mdx`,
      data: () => {
        const urlPath = `/standards/common-core/math/${g.slug}/${d.slug}`;
        const title = `${g.label} ${d.label} — Common Core`;
        return (
          fmFor({
            title,
            sidebarTitle: d.label,
            description: `Common Core ${d.label} standards for ${g.label}, with explanations and classroom examples for teachers.`,
            keywords: ["Common Core math", `${g.label} ${d.label}`, d.label, `Grade ${g.code} math`],
            urlPath,
          }) +
          `# What are the Common Core ${d.label} standards for ${g.label}?\n\n` +
          answerBox(`TODO: 50–80 word simple summary covering ${g.label} ${d.label} domain standards.`) +
          breadcrumb([
            { name: "Standards", path: "/standards" },
            { name: "Common Core", path: "/standards/common-core" },
            { name: "Math", path: "/standards/common-core/math" },
            { name: g.label, path: `/standards/common-core/math/${g.slug}` },
            { name: d.label, path: urlPath },
          ]) +
          learningResource({ name: title, urlPath, level: g.label }) +
          "## What it covers\n\n- TODO: cluster headings\n- TODO: cluster headings\n\n" +
          "## Standards\n\n" +
          `<table class="standards-table">\n` +
          `  <thead><tr><th>Code</th><th>Official text</th><th>Plain meaning</th><th>Student skill</th><th>Example</th></tr></thead>\n` +
          `  <tbody><tr><td>TBD</td><td>TODO</td><td>TODO</td><td>TODO</td><td>TODO</td></tr></tbody>\n` +
          `</table>\n\n` +
          "## Classroom application\n\nTODO\n\n" +
          "## Related pages\n\n" +
          g.domains
            .filter((x) => x.slug !== d.slug)
            .map((x) => `- [${x.label}](/standards/common-core/math/${g.slug}/${x.slug})`)
            .join("\n") +
          `\n- [${g.label} math hub](/standards/common-core/math/${g.slug})\n` +
          `- [Math hub](/standards/common-core/math)\n\n` +
          citation(`https://www.corestandards.org/Math/Content/${g.code}/${d.label.match(/[A-Z]/g)?.join("") ?? ""}/`) +
          canonicalSummary(`TODO: 60–100 word extractable summary of ${g.label} ${d.label}.`)
        );
      },
    });
  }
}

/* Math high-school hub --------------------------------------------- */
pages.push({
  rel: "standards/common-core/math/high-school/index.mdx",
  data: () => {
    const urlPath = "/standards/common-core/math/high-school";
    const title = "Common Core High School Math — conceptual categories";
    return (
      fmFor({
        title,
        sidebarTitle: "High school overview",
        description:
          "Common Core high school math is organized into 6 conceptual categories instead of grade levels: Number & Quantity, Algebra, Functions, Modeling, Geometry, and Statistics & Probability.",
        keywords: ["Common Core high school math", "high school algebra standards", "conceptual categories"],
        urlPath,
      }) +
      "# What are the Common Core math standards for high school?\n\n" +
      answerBox(
        "TODO: 50–80 word simple summary explaining that high school CCSS Math is organized by 6 conceptual categories rather than by grade.",
      ) +
      breadcrumb([
        { name: "Standards", path: "/standards" },
        { name: "Common Core", path: "/standards/common-core" },
        { name: "Math", path: "/standards/common-core/math" },
        { name: "High school", path: urlPath },
      ]) +
      learningResource({ name: title, urlPath, level: "Grades 9-12" }) +
      "## The 6 conceptual categories\n\n" +
      "<CardGroup cols={2}>\n" +
      MATH_HS.map(
        (c) =>
          `  <Card title="${c.label}" href="/standards/common-core/math/high-school/${c.slug}">High school ${c.label} standards.</Card>`,
      ).join("\n") +
      "\n</CardGroup>\n\n" +
      citation("https://www.corestandards.org/Math/Content/HSN/") +
      canonicalSummary("TODO: 60–100 word extractable summary of HS conceptual categories.")
    );
  },
});

for (const c of MATH_HS) {
  pages.push({
    rel: `standards/common-core/math/high-school/${c.slug}.mdx`,
    data: () => {
      const urlPath = `/standards/common-core/math/high-school/${c.slug}`;
      const title = `High school ${c.label} — Common Core`;
      return (
        fmFor({
          title,
          sidebarTitle: c.label,
          description: `Common Core high school ${c.label} standards with explanations, classroom examples, and citations.`,
          keywords: ["Common Core", `high school ${c.label}`, c.label],
          urlPath,
        }) +
        `# What are the Common Core high school ${c.label} standards?\n\n` +
        answerBox(`TODO: 50–80 word simple summary covering the high school ${c.label} conceptual category.`) +
        breadcrumb([
          { name: "Standards", path: "/standards" },
          { name: "Common Core", path: "/standards/common-core" },
          { name: "Math", path: "/standards/common-core/math" },
          { name: "High school", path: "/standards/common-core/math/high-school" },
          { name: c.label, path: urlPath },
        ]) +
        learningResource({ name: title, urlPath, level: "Grades 9-12" }) +
        "## What it covers\n\n- TODO: cluster headings\n- TODO: cluster headings\n\n" +
        "## Related pages\n\n" +
        MATH_HS.filter((x) => x.slug !== c.slug)
          .map((x) => `- [High school ${x.label}](/standards/common-core/math/high-school/${x.slug})`)
          .join("\n") +
        `\n- [High school overview](/standards/common-core/math/high-school)\n` +
        `- [Math hub](/standards/common-core/math)\n\n` +
        citation(`https://www.corestandards.org/Math/Content/HS${c.label.match(/[A-Z]/g)?.join("") ?? ""}/`) +
        canonicalSummary(`TODO: 60–100 word extractable summary of high school ${c.label}.`)
      );
    },
  });
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

let written = 0;
let skipped = 0;
for (const p of pages) {
  const r = await writeFileSafe(p.rel, p.data());
  if (r.wrote) written++;
  else skipped++;
}

/* remove placeholder ela.mdx and math.mdx now that ela/index.mdx and math/index.mdx exist */
for (const old of ["standards/common-core/ela.mdx", "standards/common-core/math.mdx"]) {
  if (await deleteIfExists(old)) {
    console.log(`removed legacy ${old}`);
  }
}

console.log(`wrote ${written}, skipped ${skipped}, total ${pages.length}`);
