# Focused Input Parity Notes

## RoyScript baseline — 18 August 2026

The custom **Insert Link** dialog was opened in the live RoyScript workspace. Its URL input showed the reported blue focus treatment: a blue caret, a blue-tinted focus border, and a subtly blue focus surface. This is consistent with the global input/textarea caret and focus declarations in `client/src/index.css` and will be compared directly with LexKit before the approved correction is applied.

No production behavior or styling has been changed by this evidence capture.

## LexKit live comparison — initial access

LexKit’s live editor was opened successfully and its **Insert Link** control was located. The first attempt to activate the dialog by semantic element index timed out in the browser automation layer; no application-side change or conclusion was drawn from that timeout. A fresh page-state inspection will be used before choosing a different, non-repeated interaction path.

The LexKit page was reopened successfully. A rendered-coordinate activation attempt did not open a dialog, so this comparison will next use a non-mutating DOM inspection to identify the exact button geometry rather than infer focus behavior from an unsuccessful click.

DOM inspection confirmed that LexKit’s actual **Insert Link** button is at approximately `x=387.5`, `y=683`, measuring `36 × 36` px, and has the title `Insert Link`. A direct click at that inspected location again timed out in the automation layer. The next comparison action will use the page’s own DOM click method, then inspect any resulting dialog and its computed focused-input styles.

## Verified implementation comparison

The live-page activation tooling became unavailable before the LexKit dialog could be opened, so the visual comparison was completed against the local LexKit source that powers the same default template. Its `.lexkit-input:focus` deliberately uses the active accent for the border and a restrained `0 0 0 3px rgba(59, 130, 246, 0.1)` focus halo. That local focus indicator is therefore **not** the visual discrepancy and will be preserved.

RoyScript’s custom Link, Image URL, Caption, and Table dialog fields use the same `lexkit-input` class. The discrepancy is the extra global override in `client/src/index.css`: it forces blue caret colors on every input and textarea with `!important`, and it globally forces a blue hover border plus transform on raw inputs. The approved correction will remove these global overrides from the LexKit editor route so the caret follows the text foreground while the component’s own light, accessible LexKit focus border and halo remain intact.
