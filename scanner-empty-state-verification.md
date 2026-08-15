# Scanner Empty Upload-State Verification

## Visual contract

The empty middle scanner stage was redesigned only. Its former dashed boundary, long file-extension wall, separate drag/drop instruction, `or` spacer, and underlined secondary actions were replaced by one calm, integrated upload surface. The retained interaction contract is represented by stable markers for local files, public links, and image sequences.

## Live desktop evidence

The no-credit scanner demonstration captured the current empty state at `1280 × 820` after the redesign. The modal presents a small document glyph, **Add a document**, one short explanatory sentence, a single accent **Choose file** action, two subdued secondary paths (**From link** and **Image sequence**), and one compact capability/limit line. The screenshot shows clear breathing room, no dotted boundary, no text collision with the scanner controls, and the surrounding modal structure unchanged.

## Preserved behavior

The same live run completed local upload, crop/clip, Scan-to-Stop preflight, mocked scan completion, workspace Send, 100 MB rejection, server-backed public-link import, and two-image sequence import with zero browser errors. The focused Vitest source contract, TypeScript check, and production build also passed.
# Scanner Empty-State Visual Verification

## Mobile follow-up finding

The first narrow-width inspection confirmed that the new visual hierarchy was calmer than the prior dotted upload zone, but also exposed a real integration issue: the lower `From link` and `Image sequence` actions were positioned behind the fixed scanner action bar. The next correction therefore reduces only the mobile empty-state height and vertical rhythm, while retaining the full desktop surface, all three import routes, the stated 20 MB limit, and the scanner action bar unchanged. The focused browser probe now asserts that the entire empty surface and each of its import controls are clear of the action bar, not merely contained by the modal shell.

## Final visual result

The finished desktop light surface replaces the dotted outline and repeated format wall with one soft integrated card: a quiet document icon, one title, one supporting sentence, a single primary file action, and a small utility row for the two secondary import paths. The truthful `PDF · Images · Text · Up to 20 MB` note is retained, but visually de-emphasized.

At 390 × 844 in both light and dark themes, the compact surface now ends above the action bar: the measured bottom edge was approximately 715 px, while the action bar began at approximately 717 px. Each action remained inside the card and modal, and the final dark inspection confirmed the link and image-sequence actions are readable and unobstructed. The desktop 1280 × 820 run retained the larger, spacious presentation. All four focused theme/viewport geometry checks completed with zero browser errors.

## Runtime recovery and final checks

The full-stack development server’s two OAuth cookie-parser imports were updated to use the package’s ESM-compatible default namespace. After restart, the client and public tRPC endpoint responded normally. The scanner’s prior external OpenCV documentation-host request was also replaced with the compatible `@techstark/opencv-js` 4.8 browser distribution; the existing Canvas fallback remains unchanged. The final complete scanner flow reported zero browser errors while exercising upload, crop/clip, Stop, scan, Send, 100 MB rejection, public-link import, and two-page image sequence import. Vitest passed 9 assertions, and the TypeScript check plus production build completed successfully.
