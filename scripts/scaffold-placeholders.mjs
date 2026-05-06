#!/usr/bin/env node
/**
 * Scaffold the new top-level sections requested in the IA refresh.
 *
 * Adds placeholder MDX files for:
 *   - /standards/getting-started/*
 *   - /standards/state-standards/* (expands the existing hub)
 *   - /standards/assessments/{ap,sat,act}/*
 *   - /standards/guides/*
 *   - /standards/reference/*
 *   - /standards/ngss/* (per-standard examples)
 *   - /standards/common-core/ela/* (per-standard examples)
 *   - /standards/{c3-framework,udl}.mdx (new top-level framework leaves)
 *
 * Also moves /standards/frameworks/{casel,iste,wida}.mdx up one level
 * to match the requested flat layout and removes the empty folder.
 *
 * Re-runnable. Existing files are skipped unless --force is passed.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const force = process.argv.includes("--force");
const SITE = "https://standards.legend.org";
const TODAY = "2026-05-06";

function fm({ title, sidebarTitle, description, urlPath, keywords = [] }) {
  const lines = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `sidebarTitle: ${JSON.stringify(sidebarTitle ?? title)}`,
    `description: ${JSON.stringify(description)}`,
  ];
  if (keywords.length) lines.push(`keywords: [${keywords.map((k) => JSON.stringify(k)).join(", ")}]`);
  lines.push(
    `"og:title": ${JSON.stringify(title)}`,
    `"og:description": ${JSON.stringify(description)}`,
    `"og:image": "/og/default.png"`,
    `"twitter:card": "summary_large_image"`,
    `canonical: ${JSON.stringify(`${SITE}${urlPath}`)}`,
    `robots: "index,follow,max-snippet:-1,max-image-preview:large"`,
    `author: "Legend Standards Editorial"`,
    `last_updated: ${JSON.stringify(TODAY)}`,
    "---",
    "",
  );
  return lines.join("\n");
}

function placeholderBody(title, urlPath) {
  return [
    `# ${title}`,
    "",
    `<div class="answer-box">`,
    `TODO: 50–80 word direct answer. Placeholder — content coming soon.`,
    `</div>`,
    "",
    `## What this page will cover`,
    "",
    `- TODO`,
    `- TODO`,
    "",
    `<div class="canonical-summary">`,
    `TODO: 60–100 word extractable summary for LLM ingestion.`,
    `</div>`,
    "",
  ].join("\n");
}

async function writePage(rel, meta) {
  const abs = path.join(root, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  if (!force) {
    try {
      await fs.access(abs);
      return false;
    } catch {}
  }
  const contents = fm(meta) + placeholderBody(meta.title, meta.urlPath);
  await fs.writeFile(abs, contents, "utf8");
  return true;
}

async function moveFile(from, to) {
  const fromAbs = path.join(root, from);
  const toAbs = path.join(root, to);
  try {
    await fs.access(fromAbs);
  } catch {
    return false;
  }
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  await fs.rename(fromAbs, toAbs);
  return true;
}

async function rmDirIfEmpty(rel) {
  const abs = path.join(root, rel);
  try {
    const entries = await fs.readdir(abs);
    if (entries.length === 0) {
      await fs.rmdir(abs);
      return true;
    }
  } catch {}
  return false;
}

/* -------------------------------------------------------------- */
/* page list                                                      */
/* -------------------------------------------------------------- */

const pages = [
  /* getting started ------------------------------------------- */
  {
    rel: "standards/getting-started/what-are-learning-standards.mdx",
    title: "What are learning standards?",
    sidebarTitle: "What are learning standards?",
    description: "A teacher-friendly explanation of what learning standards are, who writes them, and how they shape what students are expected to know and do.",
    urlPath: "/standards/getting-started/what-are-learning-standards",
    keywords: ["learning standards", "what are standards"],
  },
  {
    rel: "standards/getting-started/standards-vs-curriculum-vs-rubrics.mdx",
    title: "Standards vs. curriculum vs. rubrics",
    sidebarTitle: "Standards vs. curriculum vs. rubrics",
    description: "How learning standards, curriculum, and rubrics differ, and how the three fit together in real classroom planning and assessment.",
    urlPath: "/standards/getting-started/standards-vs-curriculum-vs-rubrics",
    keywords: ["standards vs curriculum", "rubrics"],
  },
  {
    rel: "standards/getting-started/how-to-use-this-site.mdx",
    title: "How to use Legend Standards",
    sidebarTitle: "How to use this site",
    description: "How to navigate the Legend Standards reference, how every page is structured, and how to turn a standard into a rubric, lesson, or feedback.",
    urlPath: "/standards/getting-started/how-to-use-this-site",
    keywords: ["Legend Standards", "how to use"],
  },

  /* common core ela leaf examples ----------------------------- */
  {
    rel: "standards/common-core/ela/grade-9-10-writing.mdx",
    title: "Common Core ELA — Grade 9-10 Writing",
    sidebarTitle: "Grade 9-10 writing",
    description: "Plain-English summary of the Grade 9-10 writing standards, with classroom examples, rubric language, and citations.",
    urlPath: "/standards/common-core/ela/grade-9-10-writing",
    keywords: ["Common Core writing", "Grade 9-10 writing", "W.9-10"],
  },
  {
    rel: "standards/common-core/ela/w-9-10-1.mdx",
    title: "W.9-10.1 — Argument writing (Grades 9-10)",
    sidebarTitle: "W.9-10.1",
    description: "What W.9-10.1 says, what it means in plain English, and how to teach and assess argument writing in grades 9-10.",
    urlPath: "/standards/common-core/ela/w-9-10-1",
    keywords: ["W.9-10.1", "argument writing", "Common Core"],
  },
  {
    rel: "standards/common-core/ela/w-9-10-2.mdx",
    title: "W.9-10.2 — Informative/explanatory writing (Grades 9-10)",
    sidebarTitle: "W.9-10.2",
    description: "What W.9-10.2 says, what it means in plain English, and how to teach and assess informative writing in grades 9-10.",
    urlPath: "/standards/common-core/ela/w-9-10-2",
    keywords: ["W.9-10.2", "informative writing", "Common Core"],
  },

  /* ngss leaf examples ---------------------------------------- */
  {
    rel: "standards/ngss/high-school-biology.mdx",
    title: "NGSS — High school biology",
    sidebarTitle: "High school biology",
    description: "What the Next Generation Science Standards expect for high school biology, organized by performance expectation and disciplinary core idea.",
    urlPath: "/standards/ngss/high-school-biology",
    keywords: ["NGSS biology", "high school biology standards", "HS-LS"],
  },
  {
    rel: "standards/ngss/hs-ls1-1.mdx",
    title: "HS-LS1-1 — Structure and function of macromolecules",
    sidebarTitle: "HS-LS1-1",
    description: "What HS-LS1-1 says, in plain English, with classroom examples and the underlying disciplinary core idea, practice, and crosscutting concept.",
    urlPath: "/standards/ngss/hs-ls1-1",
    keywords: ["HS-LS1-1", "NGSS biology", "macromolecules"],
  },

  /* top-level framework leaves -------------------------------- */
  {
    rel: "standards/c3-framework.mdx",
    title: "C3 Framework — social studies standards",
    sidebarTitle: "C3 Framework",
    description: "The College, Career, and Civic Life (C3) Framework for K-12 social studies state standards: civics, economics, geography, and history.",
    urlPath: "/standards/c3-framework",
    keywords: ["C3 Framework", "social studies standards", "NCSS"],
  },
  {
    rel: "standards/udl.mdx",
    title: "Universal Design for Learning (UDL) guidelines",
    sidebarTitle: "UDL",
    description: "The CAST Universal Design for Learning guidelines: engagement, representation, action and expression — for inclusive, accessible classrooms.",
    urlPath: "/standards/udl",
    keywords: ["UDL", "Universal Design for Learning", "CAST"],
  },

  /* state standards ------------------------------------------- */
  {
    rel: "standards/state-standards/new-york.mdx",
    title: "New York learning standards",
    sidebarTitle: "New York",
    description: "New York State Next Generation Learning Standards for ELA, math, science, and social studies, with how they map to national frameworks.",
    urlPath: "/standards/state-standards/new-york",
    keywords: ["New York standards", "NYSED", "Next Generation Learning Standards"],
  },
  {
    rel: "standards/state-standards/california.mdx",
    title: "California learning standards",
    sidebarTitle: "California",
    description: "California's K-12 content standards in ELA, math, science (NGSS), and history-social science.",
    urlPath: "/standards/state-standards/california",
    keywords: ["California standards", "CA CCSS", "California content standards"],
  },
  {
    rel: "standards/state-standards/texas.mdx",
    title: "Texas Essential Knowledge and Skills (TEKS)",
    sidebarTitle: "Texas",
    description: "Texas Essential Knowledge and Skills (TEKS) — the state's K-12 learning standards for every subject area.",
    urlPath: "/standards/state-standards/texas",
    keywords: ["TEKS", "Texas standards", "Texas Essential Knowledge and Skills"],
  },
  {
    rel: "standards/state-standards/florida.mdx",
    title: "Florida B.E.S.T. Standards",
    sidebarTitle: "Florida",
    description: "Florida's Benchmarks for Excellent Student Thinking (B.E.S.T.) standards for ELA, math, civics, and other content areas.",
    urlPath: "/standards/state-standards/florida",
    keywords: ["Florida BEST", "Florida standards", "B.E.S.T."],
  },

  /* assessments ----------------------------------------------- */
  {
    rel: "standards/assessments/index.mdx",
    title: "Assessment frameworks and rubrics",
    sidebarTitle: "Overview",
    description: "AP, SAT, and ACT skill expectations, scoring rubrics, and how they map to classroom standards.",
    urlPath: "/standards/assessments",
    keywords: ["AP", "SAT", "ACT", "assessment frameworks"],
  },
  {
    rel: "standards/assessments/ap/index.mdx",
    title: "AP courses — course frameworks and CED summaries",
    sidebarTitle: "AP overview",
    description: "Course frameworks, exam structures, and Course and Exam Description (CED) summaries for College Board AP courses.",
    urlPath: "/standards/assessments/ap",
    keywords: ["AP", "College Board", "CED"],
  },
  {
    rel: "standards/assessments/ap/english-language.mdx",
    title: "AP English Language and Composition",
    sidebarTitle: "AP English Language",
    description: "AP English Language and Composition course requirements, units, skills, and exam scoring rubrics.",
    urlPath: "/standards/assessments/ap/english-language",
    keywords: ["AP English Language", "AP Lang", "rhetorical analysis"],
  },
  {
    rel: "standards/assessments/ap/biology.mdx",
    title: "AP Biology",
    sidebarTitle: "AP Biology",
    description: "AP Biology course and exam description: units, science practices, and scoring guidance for the free-response sections.",
    urlPath: "/standards/assessments/ap/biology",
    keywords: ["AP Biology", "CED", "science practices"],
  },
  {
    rel: "standards/assessments/sat/index.mdx",
    title: "SAT — reading, writing, and math expectations",
    sidebarTitle: "SAT overview",
    description: "What the SAT measures in reading, writing, and math, plus how its skills map to classroom standards.",
    urlPath: "/standards/assessments/sat",
    keywords: ["SAT", "College Board"],
  },
  {
    rel: "standards/assessments/sat/reading-writing.mdx",
    title: "SAT Reading and Writing skills",
    sidebarTitle: "Reading and writing",
    description: "Official SAT Reading and Writing skills, with classroom-friendly explanations and practice expectations.",
    urlPath: "/standards/assessments/sat/reading-writing",
    keywords: ["SAT Reading", "SAT Writing", "SAT skills"],
  },
  {
    rel: "standards/assessments/act/index.mdx",
    title: "ACT — skills and rubrics",
    sidebarTitle: "ACT overview",
    description: "ACT skill expectations and scoring rubrics across English, math, reading, science, and writing.",
    urlPath: "/standards/assessments/act",
    keywords: ["ACT"],
  },
  {
    rel: "standards/assessments/act/writing-rubric.mdx",
    title: "ACT writing rubric — scored examples",
    sidebarTitle: "Writing rubric",
    description: "Official ACT writing rubric with annotated examples of each score band and what scorers look for.",
    urlPath: "/standards/assessments/act/writing-rubric",
    keywords: ["ACT writing rubric", "ACT essay"],
  },

  /* guides ---------------------------------------------------- */
  {
    rel: "standards/guides/turn-a-standard-into-a-rubric.mdx",
    title: "Turn a standard into a rubric",
    sidebarTitle: "Standard to rubric",
    description: "A step-by-step guide to converting any learning standard into a 4-level classroom rubric with proficiency descriptors.",
    urlPath: "/standards/guides/turn-a-standard-into-a-rubric",
    keywords: ["standards-aligned rubric", "rubric template"],
  },
  {
    rel: "standards/guides/write-feedback-from-a-standard.mdx",
    title: "Write feedback from a standard",
    sidebarTitle: "Feedback from a standard",
    description: "How to translate a learning standard into specific, actionable feedback that helps students grow toward mastery.",
    urlPath: "/standards/guides/write-feedback-from-a-standard",
    keywords: ["standards-aligned feedback", "rubric feedback"],
  },
  {
    rel: "standards/guides/align-an-assignment-to-standards.mdx",
    title: "Align an assignment to standards",
    sidebarTitle: "Align an assignment",
    description: "How to take an existing assignment and map it to the standards it actually measures, so you can grade and report consistently.",
    urlPath: "/standards/guides/align-an-assignment-to-standards",
    keywords: ["standards alignment", "assignment design"],
  },
  {
    rel: "standards/guides/map-student-work-to-skills.mdx",
    title: "Map student work to skills",
    sidebarTitle: "Map work to skills",
    description: "Use evidence in student work to identify which skills are emerging, developing, or proficient against a standard.",
    urlPath: "/standards/guides/map-student-work-to-skills",
    keywords: ["evidence of mastery", "skills mapping"],
  },
  {
    rel: "standards/guides/differentiate-feedback-by-standard.mdx",
    title: "Differentiate feedback by standard",
    sidebarTitle: "Differentiate feedback",
    description: "How to give different students standards-aligned feedback that targets where each one actually is on the rubric.",
    urlPath: "/standards/guides/differentiate-feedback-by-standard",
    keywords: ["differentiated feedback", "individualized feedback"],
  },

  /* reference ------------------------------------------------- */
  {
    rel: "standards/reference/skills-taxonomy.mdx",
    title: "Skills taxonomy",
    sidebarTitle: "Skills taxonomy",
    description: "Legend Standards skills taxonomy: claim, evidence, reasoning, inquiry, modeling, source use, collaboration, and more.",
    urlPath: "/standards/reference/skills-taxonomy",
    keywords: ["skills taxonomy", "claim evidence reasoning"],
  },
  {
    rel: "standards/reference/rubric-categories.mdx",
    title: "Rubric categories",
    sidebarTitle: "Rubric categories",
    description: "How Legend Standards organizes rubric criteria across content areas and grade bands.",
    urlPath: "/standards/reference/rubric-categories",
    keywords: ["rubric categories", "rubric design"],
  },
  {
    rel: "standards/reference/grade-bands.mdx",
    title: "Grade bands reference",
    sidebarTitle: "Grade bands",
    description: "How learning standards group grade levels into bands (K-2, 3-5, 6-8, 9-10, 11-12) and what those bands mean in practice.",
    urlPath: "/standards/reference/grade-bands",
    keywords: ["grade bands", "K-2", "9-10", "11-12"],
  },
  {
    rel: "standards/reference/framework-crosswalks.mdx",
    title: "Framework crosswalks",
    sidebarTitle: "Framework crosswalks",
    description: "Side-by-side mapping between Common Core, NGSS, state standards, AP, SAT, ACT, and other frameworks.",
    urlPath: "/standards/reference/framework-crosswalks",
    keywords: ["crosswalks", "framework mapping"],
  },
];

/* -------------------------------------------------------------- */
/* main                                                           */
/* -------------------------------------------------------------- */

let written = 0,
  skipped = 0;
for (const p of pages) {
  if (await writePage(p.rel, p)) written++;
  else skipped++;
}

let moved = 0;
for (const slug of ["casel", "iste", "wida"]) {
  if (await moveFile(`standards/frameworks/${slug}.mdx`, `standards/${slug}.mdx`)) {
    moved++;
    console.log(`moved standards/frameworks/${slug}.mdx -> standards/${slug}.mdx`);
  }
}
if (await rmDirIfEmpty("standards/frameworks")) console.log("removed empty standards/frameworks/");

console.log(`wrote ${written}, skipped ${skipped}, moved ${moved}, total ${pages.length}`);
