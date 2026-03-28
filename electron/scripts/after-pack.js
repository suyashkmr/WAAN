const path = require("path");
const fs = require("fs/promises");

const SERVER_SOURCE = path.resolve(__dirname, "..", "..", "apps", "server");
const APP_WRAPPER_TEMPLATE = realExecutableName => `#!/bin/sh
if [ "\${ELECTRON_RUN_AS_NODE:-}" = "1" ]; then
  exec "$(dirname "$0")/${realExecutableName}" "$@"
fi
unset ELECTRON_RUN_AS_NODE
exec "$(dirname "$0")/${realExecutableName}" "$@"
`;

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
        // Dereference symlinks so packaged apps do not contain broken CI absolute links.
        let resolvedPath;
        try {
          resolvedPath = await fs.realpath(srcPath);
        } catch {
          console.warn(`[WAAN] Skipping broken symlink during packaging: ${srcPath}`);
          return;
        }
        const resolvedStats = await fs.lstat(resolvedPath);
        if (resolvedStats.isDirectory()) {
          await copyDir(resolvedPath, destPath);
          return;
        }
        await fs.copyFile(resolvedPath, destPath);
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

async function installMacLauncherWrapper(appOutDir, productFilename) {
  const macOsDir = path.join(
    appOutDir,
    `${productFilename}.app`,
    "Contents",
    "MacOS"
  );
  const bundleExecutable = path.join(macOsDir, productFilename);
  const realExecutableName = `${productFilename}-bin`;
  const realExecutable = path.join(macOsDir, realExecutableName);

  try {
    await fs.access(bundleExecutable);
  } catch {
    throw new Error(`[WAAN] Packaged executable missing: ${bundleExecutable}`);
  }

  await fs.rm(realExecutable, { force: true });
  await fs.rename(bundleExecutable, realExecutable);
  await fs.writeFile(bundleExecutable, APP_WRAPPER_TEMPLATE(realExecutableName), {
    mode: 0o755,
  });
  await fs.chmod(realExecutable, 0o755);
}

function shouldInstallMacLauncherWrapper(context) {
  return context?.electronPlatformName === "darwin";
}

exports.default = async function afterPack(context) {
  const { appOutDir, packager } = context;
  if (!appOutDir) {
    return;
  }
  const productFilename = packager.appInfo.productFilename;
  await copyServerResources(appOutDir, productFilename);
  if (shouldInstallMacLauncherWrapper(context)) {
    await installMacLauncherWrapper(appOutDir, productFilename);
  }
};

exports.__test = {
  APP_WRAPPER_TEMPLATE,
  shouldInstallMacLauncherWrapper,
};
