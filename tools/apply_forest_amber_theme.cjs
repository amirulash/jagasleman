/**
 * JagaSleman Forest Amber Theme Applier
 * Jalankan dari root project:
 * node tools/apply_forest_amber_theme.js
 *
 * Fungsi:
 * - Mengganti Tailwind bernuansa biru/cyan/sky/indigo menjadi emerald/amber/lime/stone.
 * - Tidak mengubah logika React, data, route, atau fungsi.
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "resources", "js"),
  path.join(ROOT, "resources", "css"),
];

const EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);

const colorMap = {
  cyan: "emerald",
  blue: "amber",
  sky: "lime",
  indigo: "stone",
};

const utilityPrefixes = [
  "bg", "text", "border", "ring", "shadow", "from", "via", "to",
  "decoration", "outline", "accent", "divide", "placeholder", "caret",
  "stroke", "fill",
];

const utilityRegex = new RegExp(
  `((?:[A-Za-z0-9_\\-\\[\\]\\/\\.]+:)*(?:${utilityPrefixes.join("|")}))-(cyan|blue|sky|indigo)-(\\d{2,3})(\\/[0-9]{1,3})?`,
  "g"
);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!["node_modules", "vendor", ".git", "storage"].includes(item)) {
        walk(fullPath, files);
      }
    } else if (EXTENSIONS.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function convert(content) {
  let next = content.replace(utilityRegex, (_, prefix, color, shade, opacity = "") => {
    return `${prefix}-${colorMap[color]}-${shade}${opacity}`;
  });

  next = next
    .replaceAll("hsl(188, 85%, 42%)", "hsl(146, 48%, 32%)")
    .replaceAll("hsl(188 85% 42%)", "hsl(146 48% 32%)")
    .replaceAll("rgba(8, 145, 178", "rgba(4, 120, 87")
    .replaceAll("rgba(37, 99, 235", "rgba(180, 83, 9")
    .replaceAll("rgb(8, 145, 178", "rgb(4, 120, 87")
    .replaceAll("rgb(37, 99, 235", "rgb(180, 83, 9");

  return next;
}

let changed = 0;
const allFiles = TARGET_DIRS.flatMap((dir) => walk(dir));

for (const file of allFiles) {
  const oldContent = fs.readFileSync(file, "utf8");
  const newContent = convert(oldContent);

  if (newContent !== oldContent) {
    fs.writeFileSync(file, newContent, "utf8");
    changed++;
    console.log("Updated:", path.relative(ROOT, file));
  }
}

console.log(`\nSelesai. ${changed} file diperbarui ke tema Forest Amber.`);
console.log("Jalankan: npm run dev lalu Ctrl + Shift + R di browser.");
