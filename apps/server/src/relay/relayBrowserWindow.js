const path = require("path");
const { spawn } = require("child_process");

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function openRelayBrowserWindow({ client, headless }) {
  if (headless) {
    throw new Error("Relay is running in headless mode. Set WAAN_RELAY_HEADLESS=false to enable the browser UI.");
  }
  if (!client || !client.pupBrowser || typeof client.pupBrowser.process !== "function") {
    throw new Error("ChatScope browser not available yet.");
  }
  const browserProcess = client.pupBrowser.process();
  if (!browserProcess) {
    throw new Error("Browser process not initialized.");
  }
  const executable =
    browserProcess.spawnfile ||
    (Array.isArray(browserProcess.spawnargs) ? browserProcess.spawnargs[0] : null);
  if (!executable) {
    throw new Error("Unable to resolve ChatScope browser executable.");
  }

  if (process.platform === "darwin") {
    const macosSegment = "/Contents/MacOS/";
    let appPath = executable;
    if (executable.includes(macosSegment)) {
      appPath = executable.slice(0, executable.indexOf(macosSegment));
    } else {
      appPath = path.dirname(executable);
    }
    await runCommand("open", ["-a", appPath]);
    return;
  }

  if (process.platform === "win32") {
    await runCommand("cmd", ["/c", "start", "", executable]);
    return;
  }

  if (process.platform === "linux") {
    await runCommand("xdg-open", [executable]);
    return;
  }

  throw new Error("Showing the ChatScope browser is not supported on this platform.");
}

module.exports = {
  openRelayBrowserWindow,
};
