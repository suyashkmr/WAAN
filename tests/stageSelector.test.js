import { beforeEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick, ref } from "vue";
import StageSelector from "../src/components/StageSelector.vue";
import { initVueStoreAdapter, syncWorkspaceRelayStatus } from "../js/appShell/vueStoreAdapter.js";
import { useWorkspaceStore, useWorkspaceStoreActions } from "../src/store/useWorkspaceStore.js";

describe("StageSelector", () => {
  const store = useWorkspaceStore();
  const storeActions = useWorkspaceStoreActions();

  beforeEach(() => {
    storeActions.resetWorkspaceState();
    initVueStoreAdapter({ enabled: true });
  });

  it("emits stage selection and keeps stage stable during relay updates", async () => {
    const mountEl = document.createElement("div");
    document.body.appendChild(mountEl);

    const activeStage = ref("workspace");
    const selectedStages = [];
    const app = createApp({
      setup() {
        return () =>
          h(StageSelector, {
            activeStage: activeStage.value,
            onSelectStage: stage => {
              selectedStages.push(stage);
              activeStage.value = stage;
              storeActions.setActiveStage(stage);
            },
          });
      },
    });
    app.mount(mountEl);

    const buttons = mountEl.querySelectorAll(".stage-selector-button");
    expect(buttons.length).toBe(4);
    buttons[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(selectedStages).toEqual(["deepdive"]);
    expect(store.ui.activeStage).toBe("deepdive");
    expect(buttons[2].getAttribute("aria-selected")).toBe("true");
    expect(buttons[2].getAttribute("data-stage-active")).toBe("true");
    expect(buttons[2].classList.contains("wa-button--primary")).toBe(true);
    expect(buttons[0].classList.contains("wa-button--sunken")).toBe(true);

    syncWorkspaceRelayStatus({ status: "running", account: "Alice", syncingChats: false });
    expect(store.ui.activeStage).toBe("deepdive");

    app.unmount();
    mountEl.remove();
  });
});
