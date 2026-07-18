import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const colorPattern = /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi;
const legacyBudgets = new Map([
  ["app/styles.css", 918],
  ["app/motion.css", 20],
]);

const errors = [];

for (const [path, budget] of legacyBudgets) {
  const source = readFileSync(join(appRoot, path), "utf8");
  const count = source.match(colorPattern)?.length ?? 0;
  if (count > budget) {
    errors.push(`${path}: hard-coded color budget increased (${count} > ${budget})`);
  }
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

for (const path of walk(join(appRoot, "app"))) {
  if (!path.endsWith(".tsx")) continue;
  const source = readFileSync(path, "utf8");
  if (colorPattern.test(source)) {
    errors.push(`${relative(appRoot, path)}: move visual color literals into theme tokens`);
  }
  colorPattern.lastIndex = 0;
  if (!path.endsWith("layout.tsx") && /theme\s*===\s*["']/.test(source)) {
    errors.push(`${relative(appRoot, path)}: business components must not branch on a theme id`);
  }
}

const anchors = readFileSync(join(appRoot, "theme/anchors.css"), "utf8");
if (/:root:not\(\[data-theme=["']ragdoll["']\]\)\s+\[data-theme-slot\]/.test(anchors)) {
  errors.push(
    "theme/anchors.css: theme slots must use manifest capabilities, not a concrete theme id",
  );
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Theme contract check passed.");
