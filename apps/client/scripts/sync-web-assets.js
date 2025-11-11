#!/usr/bin/env node
const path = require("path");
const fs = require("fs-extra");

async function main() {
  const repoRoot = path.resolve(__dirname, "../../..");
  const destRoot = path.resolve(__dirname, "../resources/web");
  const files = ["index.html", "styles.css", "analytics.json", "chat.json"];
  const directories = ["js"];

  await fs.ensureDir(destRoot);
  await fs.emptyDir(destRoot);

  await Promise.all(
    files.map(async file => {
      const source = path.join(repoRoot, file);
      if (await fs.pathExists(source)) {
        await fs.copy(source, path.join(destRoot, path.basename(file)));
      }
    })
  );

  for (const dir of directories) {
    const sourceDir = path.join(repoRoot, dir);
    if (await fs.pathExists(sourceDir)) {
      await fs.copy(sourceDir, path.join(destRoot, dir));
    }
  }

  console.log("Copied web assets to %s", destRoot);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
