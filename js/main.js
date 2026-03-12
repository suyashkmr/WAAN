import "./ui/primitivesRuntime.js";
import { mountVueAppShellRoot } from "./vue/appShellRoot.js";

mountVueAppShellRoot();
await import("./appShell.js");
