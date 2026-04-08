import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";
import FindingsStage from "../src/components/FindingsStage.vue";

describe("FindingsStage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("mounts findings stage anchors and key controls", async () => {
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);
    const app = createApp({
      render() {
        return h(FindingsStage);
      },
    });
    app.mount(mountEl);
    await nextTick();

    const stage = mountEl.querySelector("#guided-findings-stage");
    expect(stage).toBeTruthy();
    expect(stage?.getAttribute("data-stage")).toBe("findings");

    expect(mountEl.querySelector("#workspace-overview")).toBeTruthy();
    expect(mountEl.querySelector("#insight-highlights")).toBeTruthy();
    expect(mountEl.querySelector("#participants")).toBeTruthy();
    expect(mountEl.querySelector("#hourly-activity")).toBeTruthy();

    expect(mountEl.querySelector("#guided-findings-signal-title")).toBeTruthy();
    expect(mountEl.querySelector("#guided-findings-drivers-title")).toBeTruthy();
    expect(mountEl.querySelector("#guided-findings-timing-title")).toBeTruthy();

    const participantsDownload = mountEl.querySelector("#download-participants");
    const hourlyDownload = mountEl.querySelector("#download-hourly");
    expect(participantsDownload).toBeTruthy();
    expect(hourlyDownload).toBeTruthy();
    expect(participantsDownload?.classList.contains("wa-button")).toBe(true);
    expect(hourlyDownload?.classList.contains("wa-button")).toBe(true);

    app.unmount();
    mountEl.remove();
  });
});
