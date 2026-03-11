import { renderActionButton, renderDateInput, renderSelectInput } from "./primevueRenderPrimitives.js";

/**
 * @param {any} h
 * @param {{
 *   chatOptions?: { value: string, label: string }[],
 *   chatValue?: string,
 *   chatDisabled?: boolean,
 *   rangeOptions?: { value: string, label: string }[],
 *   rangeValue?: string,
 *   customVisible?: boolean,
 *   customStart?: string,
 *   customEnd?: string,
 *   customDisabled?: boolean,
 *   customMin?: string,
 *   customMax?: string,
 * }} state
 * @param {(actionId: string, payload?: any) => void} onAction
 * @param {any} [globalScope]
 */
export function createShellPageControlsRoot(h, state, onAction, globalScope = globalThis) {
  return {
    name: "ShellPageControlsRoot",
    render() {
      const chatOptions = Array.isArray(state.chatOptions) ? state.chatOptions : [];
      const rangeOptions = Array.isArray(state.rangeOptions) && state.rangeOptions.length > 0
        ? state.rangeOptions
        : [
          { value: "all", label: "All time" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 90 days" },
          { value: "180", label: "Last 180 days" },
          { value: "365", label: "Last 365 days" },
          { value: "custom", label: "Custom range" },
        ];
      const customVisible = Boolean(state.customVisible);
      const customDisabled = Boolean(state.customDisabled);

      return [
        h("label", { class: "control dataset-control", for: "chat-selector" }, [
          h("span", "Loaded chats"),
          renderSelectInput(h, {
            id: "chat-selector",
            forceNative: true,
            value: state.chatValue || "",
            options: chatOptions.length > 0 ? chatOptions : [{ value: "", label: "No chats loaded yet" }],
            disabled: Boolean(state.chatDisabled ?? chatOptions.length === 0),
            onChange: event => {
              state.chatValue = event?.target?.value || "";
              onAction("page.chat.select", { value: state.chatValue });
            },
            attrs: {
              onDblclick: () => {
                if (!state.chatValue) return;
                onAction("page.chat.force-select", { value: state.chatValue });
              },
              onKeydown: event => {
                if (event?.key !== "Enter" || !state.chatValue) return;
                event.preventDefault?.();
                onAction("page.chat.force-select", { value: state.chatValue });
              },
            },
          }, globalScope),
        ]),
        h(
          "div",
          {
            class: ["control", "custom-range", customVisible ? "" : "hidden"].filter(Boolean).join(" "),
            id: "custom-range-controls",
          },
          [
            h("span", "Custom dates"),
            h("div", { class: "custom-range-inputs" }, [
              renderDateInput(h, {
                id: "custom-start",
                forceNative: true,
                value: state.customStart || "",
                disabled: customDisabled,
                onChange: event => {
                  state.customStart = event?.target?.value || "";
                  onAction("page.range.set-custom-start", { value: state.customStart });
                },
                attrs: {
                  min: state.customMin || "",
                  max: state.customMax || "",
                },
              }, globalScope),
              h("span", { class: "range-separator" }, "to"),
              renderDateInput(h, {
                id: "custom-end",
                forceNative: true,
                value: state.customEnd || "",
                disabled: customDisabled,
                onChange: event => {
                  state.customEnd = event?.target?.value || "";
                  onAction("page.range.set-custom-end", { value: state.customEnd });
                },
                attrs: {
                  min: state.customMin || "",
                  max: state.customMax || "",
                },
              }, globalScope),
              renderActionButton(h, {
                type: "button",
                className: "ghost-button small",
                id: "apply-custom-range",
                text: "Apply",
                disabled: customDisabled,
                onClick: () =>
                  onAction("page.range.apply-custom", {
                    start: state.customStart || "",
                    end: state.customEnd || "",
                  }),
              }, globalScope),
            ]),
          ],
        ),
        h("label", { class: "control period-control", for: "global-range" }, [
          h("span", "Time range"),
          renderSelectInput(h, {
            id: "global-range",
            forceNative: true,
            value: state.rangeValue || "all",
            options: rangeOptions,
            onChange: event => {
              state.rangeValue = event?.target?.value || "";
              onAction("page.range.select", { value: state.rangeValue });
            },
          }, globalScope),
        ]),
      ];
    },
  };
}
