import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const files = (await walk("dist"))
  .filter((f) => !f.endsWith("sw.js") && !f.endsWith(".map"))
  .sort();
const hash = createHash("sha256");
for (const file of files) hash.update(await readFile(file));
const version = hash.digest("hex").slice(0, 12);
const urls = files.map((f) => `/${f.slice(5)}`);
const template = await readFile(
  "src/services/service-worker.template.js",
  "utf8",
);
await writeFile(
  "dist/sw.js",
  template
    .replace("__VERSION__", JSON.stringify(version))
    .replace("__PRECACHE__", JSON.stringify(urls)),
);
console.log(`Offline cache ${version}: ${urls.length} local assets`);
