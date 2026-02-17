const path = require("path");
const { notarize } = require("@electron/notarize");

function hasNotaryCredentials() {
  return Boolean(
    process.env.APPLE_ID &&
      process.env.APPLE_APP_SPECIFIC_PASSWORD &&
      process.env.APPLE_TEAM_ID
  );
}

exports.default = async function notarizeApp(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  if (!hasNotaryCredentials()) {
    console.log(
      "[WAAN] Skipping notarization (missing APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID)."
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[WAAN] Notarizing ${appName}.app`);
  await notarize({
    appBundleId: context.packager.appInfo.id,
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
  console.log(`[WAAN] Notarization complete for ${appName}.app`);
};
