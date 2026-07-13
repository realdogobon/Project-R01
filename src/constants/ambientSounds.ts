// Canonical list of individual ambient-sound track ids, in browsing order.
// Kept in sync with the `AMBIENT_SOUNDS` array in
// `src/components/modals/SettingsModal.tsx` (ids + order must match exactly —
// that file also carries the label/icon for each id, which isn't needed
// outside the Settings UI). Used by the Das Keyboard's ambient-mode media
// bar to step through individual tracks once all saved presets have been
// cycled through.
export const AMBIENT_SOUND_IDS = [
  "coffee-shop",
  "rain",
  "rain-on-leaves",
  "waves",
  "fireside",
  "airport",
  "winter-morning",
  "crickets",
  "singing-bowl",
  "train",
  "white-noise",
  "wind-chimes",
  "clock",
  "ceiling-fan",
  "tuning-radio",
  "fireworks",
  "owl",
  "underwater",
  "suburban-street",
  "thunder",
] as const;
