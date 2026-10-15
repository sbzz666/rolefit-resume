import { readFile } from "node:fs/promises";
const files = ["dist/index.html", "dist/styles.css", "dist/resume-tech.css", "dist/vendor/html2pdf.bundle.min.js", "dist/vendor/docx.iife.js", "dist/app.js", "desktop/main.cjs", "desktop/preload.cjs", "LICENSE"];
for (const file of files) {
  const value = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  if (!value.trim()) throw new Error(`${file} is empty`);
}
console.log(`Checked ${files.length} site files.`);

