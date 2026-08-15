# GIF-Inspired Scanner Upload Interaction Analysis

## Initial frame review

The supplied animation begins with a spacious centered upload composition. Its visual language has four recognizable elements: a compact three-document/file symbol, a concise two-line drag-and-drop instruction with selective accent emphasis, an inline browser choice, and a single rounded primary action. The reference uses a large rounded white card and a dotted inner boundary; RoyScript will borrow the **motion hierarchy and symbol-led composition**, not those borders or the light-card treatment.

The first approximately 3.6 seconds hold the composed idle state, which establishes the intended calm pacing before any transition. The RoyScript adaptation will keep the existing borderless scanner-stage surface, preserve `From link` and `Image sequence` as first-class secondary routes, and retain the supported-file and size facts in a low-emphasis location. It will not introduce a generic `Upload` confirmation step because the existing scanner needs to ingest selected files immediately.

## Planned state mapping

| Reference idea | RoyScript adaptation |
|---|---|
| Symbol-led idle state | A compact document stack marks the scanner’s empty middle stage. |
| Drag/browse invitation | A single plain-language local-file action retains the existing click and drag/drop behavior. |
| Single primary transition | Selected files move through an integrated pending transition before the existing preview renderer takes over. |
| Reference success reveal | A brief successful handoff cue precedes the normal scanner preview rather than adding an extra completion card. |
| No failure example supplied | Unsupported, oversized, malformed, or unreadable selections reverse quietly to the ready state without a visible error card, preserving the established silent-failure contract. |

## Selected-file transition evidence

At approximately 4.2 seconds, the reference introduces a selected-file row beneath its main invitation. The row has a small visual preview, filename, a light metadata line, a right-side remove affordance, and retains the primary action below it. By approximately 5.4 seconds, the Upload action receives a pressed/active treatment while the file row remains stable. The useful interaction pattern is therefore not a generic spinning upload card; it is **selection acknowledgement first**, followed by a visually continuous handoff.

RoyScript will use that behavior in its own vocabulary: a document icon rather than an image thumbnail, the selected filename and compact file metadata, and a quiet remove/retry affordance. The scanner will not gain a separate confirmation requirement—the existing selection handler remains authoritative—but it may retain this acknowledgement just long enough to make the local selection feel intentional before its normal preview pipeline takes over. `From link` and `Image sequence` will remain present as unobtrusive, accessible alternatives during the empty/ready state.

## Completion-state evidence

The reference then replaces its entire interior composition with a centered check mark and the concise line **“File successfully uploaded!”**. This is a short, celebratory handoff rather than a persistent page: the final frame returns to the ready shell, confirming that the success state is transient. The useful qualities are the small line-drawn check, the absence of extra explanations, and the way the surrounding surface appears to breathe while the content crossfades.

For RoyScript, the exact message should be adapted to the scanner lifecycle: a short `Ready` cue will appear only after a supported local file reaches the existing ingestion path, then hand off directly to the real document preview. No additional upload confirmation button will be introduced. If preparation fails before preview construction, the selected-file acknowledgement will reverse into the idle surface after a brief neutral transition; it will neither show a red error card nor imply a successful upload. This preserves the requested silent-failure behavior while making the intended UI feedback complete.
