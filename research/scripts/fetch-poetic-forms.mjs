/** Read-only Wikipedia inventory/evidence capture. Research artifacts stay outside Tauri.
 * No downloaded scripts are evaluated. Category continuation and redirects are preserved.
 * Full extracts are ignored local working evidence; the committed catalog contains
 * original summaries and page/revision attribution, not copied article bodies.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const category = "Category:Poetic forms";
const researchedOn = "2026-11-23";
const endpoint = "https://en.wikipedia.org/w/api.php";
let lastRequest = 0;
async function query(parameters) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    ...parameters,
  });
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 5000 - (Date.now() - lastRequest))),
    );
    lastRequest = Date.now();
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "VersewoldResearch/0.1 (local, read-only literary research)",
      },
      signal: AbortSignal.timeout(30000),
    });
    if (response.status !== 429) break;
    const retrySeconds = Math.min(
      30,
      Number(response.headers.get("retry-after")) || 5 * (attempt + 1),
    );
    console.log(`Wikipedia requested a pause; retrying in ${retrySeconds}s.`);
    await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));
  }
  if (!response.ok) throw new Error(`Wikipedia returned ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error(JSON.stringify(result.error));
  return result;
}

const members = [];
let continuation = {};
do {
  const result = await query({
    list: "categorymembers",
    cmtitle: category,
    cmtype: "page",
    cmlimit: "500",
    ...continuation,
  });
  members.push(...result.query.categorymembers);
  continuation = result.continue;
} while (continuation);
console.log(`Found ${members.length} direct category entries.`);

const pages = [];
const redirects = new Map();
await mkdir(new URL("artifacts/poetic-forms-wikipedia/", root), {
  recursive: true,
});
let completed = 0;
try {
  const checkpoint = JSON.parse(
    await readFile(
      new URL("artifacts/poetic-forms-wikipedia/progress.json", root),
      "utf8",
    ),
  );
  if (
    !process.argv.includes("--refresh") &&
    JSON.stringify(checkpoint.members) === JSON.stringify(members)
  ) {
    pages.push(...checkpoint.pages);
    for (const [from, to] of checkpoint.redirects) redirects.set(from, to);
    completed = checkpoint.completed;
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (let index = completed; index < members.length; index += 20) {
  const batch = members.slice(index, index + 20);
  const captured = new Map();
  let articleContinuation = {};
  do {
    const result = await query({
      pageids: batch.map((p) => p.pageid).join("|"),
      prop: "info|extracts|revisions",
      inprop: "url",
      rvprop: "ids|timestamp",
      explaintext: "1",
      exintro: "1",
      exlimit: "20",
      redirects: "1",
      ...articleContinuation,
    });
    for (const page of result.query.pages)
      captured.set(page.pageid, { ...captured.get(page.pageid), ...page });
    for (const redirect of result.query.redirects ?? [])
      redirects.set(redirect.from, redirect.to);
    articleContinuation = result.continue;
  } while (articleContinuation);
  pages.push(...captured.values());
  await writeFile(
    new URL("artifacts/poetic-forms-wikipedia/progress.json", root),
    JSON.stringify({
      members,
      completed: Math.min(index + 20, members.length),
      pages,
      redirects: [...redirects],
    }),
  );
  console.log(
    `Retrieved ${Math.min(index + 20, members.length)}/${members.length} articles`,
  );
}
const inventory = {
  schemaVersion: 1,
  researchedOn,
  category,
  categoryUrl: "https://en.wikipedia.org/wiki/Category:Poetic_forms",
  scope:
    "All direct article members; subcategories are not recursively expanded.",
  license:
    "Wikipedia source text: CC BY-SA 4.0; see each linked page history. Catalog summaries are newly written.",
  count: members.length,
  entries: members.map((member) => {
    let resolvedTitle = member.title;
    const visited = new Set();
    while (redirects.has(resolvedTitle)) {
      if (visited.has(resolvedTitle)) throw new Error("Redirect cycle");
      visited.add(resolvedTitle);
      resolvedTitle = redirects.get(resolvedTitle);
    }
    const page = pages.find(
      (p) => p.pageid === member.pageid || p.title === resolvedTitle,
    );
    if (!page || page.missing || !page.extract)
      throw new Error(`Missing article evidence: ${member.title}`);
    return {
      title: member.title,
      pageId: member.pageid,
      resolvedPageId: page.pageid,
      resolvedTitle: page.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(member.title.replaceAll(" ", "_"))}`,
      resolvedUrl: page.fullurl,
      revisionId: page.revisions[0].revid,
      revisedAt: page.revisions[0].timestamp,
      revisionUrl: `https://en.wikipedia.org/w/index.php?oldid=${page.revisions[0].revid}`,
    };
  }),
};
await mkdir(new URL("research/poetic-forms/", root), { recursive: true });
await mkdir(new URL("artifacts/poetic-forms-wikipedia/", root), {
  recursive: true,
});
await writeFile(
  new URL("research/poetic-forms/inventory.json", root),
  `${JSON.stringify(inventory, null, 2)}\n`,
);
await writeFile(
  new URL("artifacts/poetic-forms-wikipedia/evidence.json", root),
  `${JSON.stringify({ researchedOn, pages }, null, 2)}\n`,
);
console.log(
  `Inventoried ${inventory.count} direct entries; every entry has source evidence and a revision.`,
);
