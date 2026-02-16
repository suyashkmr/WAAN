const path = require("path");
const fs = require("fs/promises");

const SERVER_SOURCE = path.resolve(__dirname, "..", "..", "apps", "server");

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(
    entries.map(async entry => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else if (entry.isSymbolicLink()) {
        const link = await fs.readlink(srcPath);
        await fs.symlink(link, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    })
  );
}

async function copyServerResources(appOutDir, productFilename) {
  const resourcesDir = path.join(
    appOutDir,
    `${productFilename}.app`,
    "Contents",
    "Resources"
  );
  const destDir = path.join(resourcesDir, "waan", "apps", "server");
  await fs.rm(destDir, { recursive: true, force: true });
  await copyDir(SERVER_SOURCE, destDir);
}

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  if (!appOutDir) {
    return;
  }
  await copyServerResources(appOutDir, packager.appInfo.productFilename);
};
