import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "app/api/generate-landing/system-prompt.txt");
const dest = path.join(root, "supabase/functions/generate-landing/promptHtml.ts");
const t = fs.readFileSync(src, "utf8");
const out =
  "// Generated from app/api/generate-landing/system-prompt.txt — run: node scripts/sync-landing-system-prompt.mjs\n" +
  "export const SYSTEM_PROMPT_HTML: string = " +
  JSON.stringify(t) +
  ";\n";
fs.writeFileSync(dest, out);
console.log("Wrote", dest);
