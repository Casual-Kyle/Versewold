/** Expand the curated research into offline runtime JSON and a readable catalog.
 * This step never uses the network and never turns source prose into rules.
 * The 149-entry snapshot is a coverage contract, not a promise of expert review.
 */
import { readFile, writeFile } from "node:fs/promises";
import { definitions } from "../poetic-forms/definitions.mjs";

const root = new URL("../../", import.meta.url);
const templates = new URL("Versewold/src/domain/forms/templates/", root);
const inventory = JSON.parse(
  await readFile(new URL("research/poetic-forms/inventory.json", root), "utf8"),
);
const slug = (value) =>
  value
    .replace(/\s*\([^)]*\)/g, "")
    .replaceAll("Đ", "D")
    .replaceAll("đ", "d")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const byTitle = new Map(definitions.map((entry) => [entry.title, entry]));
if (byTitle.size !== definitions.length)
  throw new Error("Duplicate curated title.");
if (inventory.count !== inventory.entries.length)
  throw new Error("Inventory count is inconsistent.");
for (const title of byTitle.keys())
  if (!inventory.entries.some((entry) => entry.title === title))
    throw new Error(`Curated title outside the captured scope: ${title}`);
const records = [];
const ids = new Set();
for (const source of inventory.entries) {
  const definition = byTitle.get(source.title);
  if (!definition)
    throw new Error(`Research coverage missing: ${source.title}`);
  const id = definition.reuse ?? definition.id ?? slug(source.title);
  if (ids.has(id)) throw new Error(`Duplicate generated ID: ${id}`);
  ids.add(id);
  const previous = definition.reuse
    ? JSON.parse(await readFile(new URL(`${id}.json`, templates), "utf8"))
    : null;
  const structure = previous?.structure ?? definition.structure;
  if (definition.continuous) structure.unit = "line";
  const status =
    definition.status ?? (structure.kind === "free" ? "guided" : "structured");
  const form = previous ?? {
    schemaVersion: 1,
    id,
    name: definition.name ?? source.title.replace(/\s*\([^)]*\)/g, ""),
    language: definition.language,
    origin: definition.origin,
    summary: definition.summary,
    tags: [
      ...new Set([
        definition.kind,
        definition.language,
        structure.kind,
        ...(definition.aliases ?? []).slice(0, 4),
      ]),
    ],
    notes: definition.notes,
    sources: [],
    structure,
  };
  form.catalog = {
    kind: definition.kind,
    status,
    aliases: [...new Set([source.title, ...(definition.aliases ?? [])])].filter(
      (alias) => alias !== form.name,
    ),
    researchedOn: inventory.researchedOn,
    sourcePageId: source.resolvedPageId,
    sourceRevisionId: source.revisionId,
    limitations: definition.limitations ?? [],
    ...(definition.variants ? { variants: definition.variants } : {}),
  };
  const suppliedSources = [
    ...(form.sources ?? []),
    ...(definition.primarySources ?? []),
    { title: `Wikipedia — ${source.title}`, url: source.url },
    {
      title: "Wikipedia — surveyed revision and attribution",
      url: source.revisionUrl,
    },
  ];
  form.sources = [
    ...new Map(suppliedSources.map((entry) => [entry.url, entry])).values(),
  ];
  await writeFile(
    new URL(`${id}.json`, templates),
    `${JSON.stringify(form, null, 2)}\n`,
  );
  records.push({
    sourceTitle: source.title,
    templateId: id,
    ...form.catalog,
    sourceUrl: source.url,
    revisionUrl: source.revisionUrl,
  });
}

// The original named variants are additional to the category's direct members.
for (const id of ["standard-habbie", "shakespearean-sonnet", "haiku-575"]) {
  const form = JSON.parse(
    await readFile(new URL(`${id}.json`, templates), "utf8"),
  );
  form.catalog = {
    kind: "form",
    status: "structured",
    aliases: [],
    researchedOn: inventory.researchedOn,
    limitations: [],
  };
  await writeFile(
    new URL(`${id}.json`, templates),
    `${JSON.stringify(form, null, 2)}\n`,
  );
}

const counts = Object.fromEntries(
  ["structured", "guided", "reference"].map((status) => [
    status,
    records.filter((record) => record.status === status).length,
  ]),
);
const coverage = {
  schemaVersion: 1,
  researchedOn: inventory.researchedOn,
  sourceCount: inventory.count,
  categoryUrl: inventory.categoryUrl,
  counts,
  entries: records,
};
await writeFile(
  new URL("research/poetic-forms/coverage.json", root),
  `${JSON.stringify(coverage, null, 2)}\n`,
);
const index = [
  "# Complete poetic-forms category survey",
  "",
  `Surveyed ${inventory.researchedOn}. All **${inventory.count} direct category members** are accounted for. The source snapshot is not recursive: additional forms in subcategories are outside this particular inventory.`,
  "",
  `The category contributes ${counts.structured} structural templates, ${counts.guided} guided-writing entries, and ${counts.reference} reference entries. The three original named variants remain additional entries.`,
  "",
  "Structural means the selected layout is encoded, not that sound analysis or every cultural constraint is implemented. Guided entries contain researched directions and explicit limitations. Reference entries have no compose action.",
  "",
  "The survey is based on Wikipedia introductions, with full-article checks where necessary and selected institutional cross-checks. It is a broad working catalog, not a claim that every article has been independently corroborated. Uncertain provenance and missing language-specific constraints are called out. Summaries and guidance are newly written; no poem examples are imported.",
  "",
  "## Complete index",
  "",
  "| Entry | Classification | Support | Runtime ID |",
  "| --- | --- | --- | --- |",
  ...records.map(
    (record) =>
      `| [${record.sourceTitle}](${record.sourceUrl}) | ${record.kind} | ${record.status} | ${record.templateId} |`,
  ),
  "",
  "## Research notes",
  "",
];
for (const source of inventory.entries) {
  const definition = byTitle.get(source.title);
  const record = records.find((item) => item.sourceTitle === source.title);
  index.push(
    `### ${definition.name ?? source.title}`,
    "",
    definition.summary,
    "",
    ...definition.notes.map((note) => `- ${note}`),
    ...(definition.limitations ?? []).map((note) => `- Limitation: ${note}`),
    "",
    `Source: [surveyed Wikipedia revision](${source.revisionUrl}). Runtime template: \`${record.templateId}\`.`,
    "",
  );
}
await writeFile(
  new URL("research/poetic-forms/catalog.md", root),
  `${index.join("\n")}\n`,
);
console.log(
  `Covered ${records.length}/${inventory.count} entries. Runtime library: ${records.length + 3}.`,
  counts,
);
