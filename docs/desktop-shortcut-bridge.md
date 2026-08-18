# RoyScript Desktop Shortcut Bridge

RoyScript’s renderer owns every **in-app** shortcut. In a standard browser, however, the browser may reserve combinations such as `Ctrl+T`, `Ctrl+N`, `Ctrl+O`, `Ctrl+P`, and `Ctrl+W` before a page receives a keyboard event. A packaged Electron or Tauri host must intercept those combinations first, cancel the shell’s default behavior, then send the normalized accelerator to the renderer through the bridge described here.

The renderer already listens for the `royscript-desktop-shortcut` event and redispatches its detail into the standard keyboard event chain. This means the existing contextual gates—exam locks, sealed tabs, open editor dialogs, command palette handling, LexKit commands, and Settings—remain the single source of truth. The package host must not reimplement any document, editor, or tab behavior.

| Required event detail | Example |
|---|---|
| `key` | `"t"` |
| `code` | `"KeyT"` |
| `ctrlKey`, `metaKey`, `shiftKey`, `altKey` | `true`, `false`, `false`, `false` |
| `repeat` | `false` |

An Electron preload bridge should dispatch the event into the page after the main process handles `webContents.before-input-event` and calls `event.preventDefault()` for a supported RoyScript accelerator.

```ts
window.dispatchEvent(new CustomEvent("royscript-desktop-shortcut", {
  detail: { key: "t", code: "KeyT", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, repeat: false },
}));
```

For Tauri, the equivalent webview/window shortcut listener should prevent its default action and emit the same DOM custom event through the initialized frontend bridge. The renderer then routes `Ctrl+T` to New Tab and all other delivered accelerators through their existing, contextual handlers.
