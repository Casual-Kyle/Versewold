/** Fetch selected full articles for structural questions the introductions omit. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../../", import.meta.url);
const directory = new URL("artifacts/poetic-forms-wikipedia/details/", root);
await mkdir(directory, { recursive: true });
const inventory = JSON.parse(
  await readFile(new URL("research/poetic-forms/inventory.json", root), "utf8"),
);
for (const title of process.argv.slice(2)) {
  const entry = inventory.entries.find((item) => item.title === title);
  if (!entry) throw new Error(`Not in the captured category: ${title}`);
  const destination = new URL(`${entry.pageId}.json`, directory);
  try {
    await readFile(destination);
    console.log(`Cached: ${title}`);
    continue;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    oldid: String(entry.revisionId),
    revids: String(entry.revisionId),
    prop: "extracts",
    explaintext: "1",
    exlimit: "1",
  });
  // TextExtracts exposes the current article, so explicitly record the retrieval
  // alongside the pinned inventory revision; it is not claimed as a historical extract.
  url.searchParams.delete("oldid");
  url.searchParams.delete("revids");
  url.searchParams.set("pageids", String(entry.resolvedPageId));
  const response = await fetch(url, {
    headers: {
      "User-Agent": "VersewoldResearch/0.1 (read-only poetry research)",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      `Wikipedia requested ${response.status}; stop and respect its limit.`,
    );
  const result = await response.json();
  const page = result.query?.pages?.[0];
  if (!page?.extract) throw new Error(`No article detail for ${title}`);
  await writeFile(
    destination,
    JSON.stringify(
      {
        title,
        retrievedOn: "2026-11-23",
        inventoryRevisionId: entry.revisionId,
        ...page,
      },
      null,
      2,
    ),
  );
  console.log(`Detailed: ${title}`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
