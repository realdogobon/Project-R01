// Platform-neutral application exit abstraction for RoyScript TSR.
//
// In plain browser sessions, web pages cannot force-close a tab the user
// opened manually. A Close all tabs control is therefore available only when
// a packaged shell exposes the direct bridge below. This prevents a browser
// preview from removing every workspace tab while the editor stays mounted.
//
// Bridge contract (either works; packaged shells choose one):
//
//   Electron preload:
//     window.__royscriptExit = () => window.electronAPI.quit()
//
//   Tauri initialization (inject before load):
//     window.__royscriptExit = () => { exit() }
//
// The packaged shell owns actual termination. The web app only requests it
// after the existing dirty-state confirmation has been resolved.

declare global {
  interface Window {
    __royscriptExit?: () => void | boolean | Promise<void | boolean>;
  }
}

export const ROYSCRIPT_REQUEST_EXIT_EVENT = "royscript-request-exit";

export type ExitRequestSource = "closeAllTabs" | "lastTabClosed" | string;

export function hasRoyScriptDesktopExitBridge(): boolean {
  return typeof window !== "undefined" && typeof window.__royscriptExit === "function";
}

export function requestRoyScriptExit(source: ExitRequestSource): boolean {
  if (!hasRoyScriptDesktopExitBridge()) return false;

  try {
    // The shell bridge is authoritative. A Promise-returning bridge is also
    // accepted because Electron/Tauri wrappers may terminate asynchronously.
    window.__royscriptExit?.();
    window.dispatchEvent(
      new CustomEvent(ROYSCRIPT_REQUEST_EXIT_EVENT, { detail: { source } }),
    );
    return true;
  } catch {
    // Exit request must always fail silently at the app level.
    return false;
  }
}
