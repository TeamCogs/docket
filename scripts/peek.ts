import { openMatter, getChunksTable } from "../src/lib/lancedb";

const conn = await openMatter("demo-enron");
const table = await getChunksTable(conn, 768);
const sample = await table.query().limit(3).toArray();
console.log("First 3 chunks:");
for (const row of sample) {
  console.log("---");
  console.log(`chunk_id: ${(row as any).chunk_id}`);
  console.log(`text (first 200 chars): ${(row as any).text.slice(0, 200)}`);
}