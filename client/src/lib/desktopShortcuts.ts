export const ROYSCRIPT_DESKTOP_SHORTCUT_EVENT = "royscript-desktop-shortcut";

export type RoyScriptDesktopShortcut = Pick<
  KeyboardEventInit,
  "key" | "code" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey" | "repeat"
>;

function isDesktopShortcut(value: unknown): value is RoyScriptDesktopShortcut {
  return !!value && typeof value === "object" && typeof (value as RoyScriptDesktopShortcut).key === "string";
}

/**
 * Bridges a package host's intercepted accelerator back into the ordinary
 * renderer event chain. Browser-reserved combinations such as Ctrl+T cannot
 * be reliably intercepted by a web page, but Electron/Tauri can prevent them
 * at the host layer and emit this event to preserve the same in-app routing.
 */
export function dispatchRoyScriptDesktopShortcut(shortcut: RoyScriptDesktopShortcut): boolean {
  if (typeof document === "undefined" || !shortcut.key) return false;

  const target = document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
  const event = new KeyboardEvent("keydown", {
    ...shortcut,
    bubbles: true,
    cancelable: true,
  });
  return !target.dispatchEvent(event) || event.defaultPrevented;
}

export function installRoyScriptDesktopShortcutBridge(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleDesktopShortcut = (event: Event) => {
    const shortcut = (event as CustomEvent<unknown>).detail;
    if (isDesktopShortcut(shortcut)) {
      dispatchRoyScriptDesktopShortcut(shortcut);
    }
  };

  window.addEventListener(ROYSCRIPT_DESKTOP_SHORTCUT_EVENT, handleDesktopShortcut);
  return () => window.removeEventListener(ROYSCRIPT_DESKTOP_SHORTCUT_EVENT, handleDesktopShortcut);
}
