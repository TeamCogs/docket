import { ingestFolder } from "../src/lib/ingest";

const matterId = process.argv[2] ?? "demo-enron";
const matterName = process.argv[3] ?? "Enron — first read";
const folder = process.argv[4] ?? "demo-data/enron";

console.log(`Ingesting ${folder} as matter '${matterId}'…`);
const result = await ingestFolder(matterId, matterName, folder, (p) => {
  process.stdout.write(`\r[${p.done}/${p.total}] ${p.current ?? ""}        `);
});
console.log("\nDone:", {
  docs: result.documents.length,
  chunks: result.totalChunks,
  outliers: result.outlierDocIds.length,
});