// Stamps each build, so an open tab can notice a newer Kelus and reload (see components/UpdateWatcher.tsx).
import { writeFileSync } from "node:fs";
const id = (process.env.GITHUB_SHA || "").slice(0, 12) || Date.now().toString(36);
writeFileSync("public/version.json", JSON.stringify({ id }) + "\n");
console.log("kelus build", id);
