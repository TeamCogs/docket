import { generateBrief } from "../src/lib/generate";
import { writeFileSync } from "node:fs";

const brief = await generateBrief({
  matterId: "demo-enron",
  matterName: "Enron — first read",
  onSectionReady: (s) => {
    console.log(
      `✓ ${s.kind} — ${("content" in s ? JSON.stringify(s.content).length : 0)} chars, ${s.suppressedCount} suppressed`,
    );
  },
});
writeFileSync("data/matters/demo-enron/brief.json", JSON.stringify(brief, null, 2));
console.log("\nBrief written. Total suppressed:", brief.totalSuppressed);