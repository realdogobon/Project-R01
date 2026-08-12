# Production 404 asset audit (internal notes)

## Verified facts (headless Chromium tests, 2026-08-12)
- Dev preview (both 127.0.0.1:3000 and gateway https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer/): loads CLEAN, 0 console errors, root renders (title "RoyScript TSR").
- The "errors in preview" the user sees = the preview-panel screenshot tool's STALE cached error page (identical 130020-byte image replayed for hours). Dev app is healthy. Proof: puppeteer-core test script /tmp/e2e_test.mjs (run: `node /tmp/e2e_test.mjs <url>`; exit 2 = react crash).
- PRODUCTION https://royscript-qeditcvm.manus.space/ : loads and renders but throws MANY 404s for static assets:
  - /assets/fonts/*.woff2 (Roboto-Regular.woff2, GeistMono-Medium.woff2, SourceCodePro-*.woff2...), /assets/fonts/google_fonts.css
  - /assets/sounds/keyboard/click{1,2,4,5,6,7,20}/{n}.wav, /assets/sounds/keyboard/error{1,5}/{n}.wav
  - /assets/sounds/ambient/*.wav
  - /assets/languages/*.json (en_core, en_novice, en_med, en_elite, en_bard, en_law, en_contract, en_passages, en_twin, en_max, en_err, en_vintage, en_pro, hi_shabda, bn_shobdo, mr_shabda, sa_mantra, ta_varta, te_pada, hinglish_baat)
  - /assets/images/*.png (logo, stop-exam, times-up, CherryMX2ARed/Blue/Brown.png)
  - /assets/pdf/* (referenced in Workspace.tsx)

## Code references
- Hardcoded `/assets/...` paths remain in: client/src/App.tsx, components/modals/SettingsModal.tsx, contexts/SettingsContext.tsx (google_fonts.css link href + @font-face woff2), hooks/useAmbientEngine.ts, hooks/useSoundEngine.ts, lib/word-engine.ts, pages/Workspace.tsx, constants/themes.ts? (FONT_OPTIONS with mtFileName)
- No `manus-storage` URLs exist anywhere in client/src — the earlier checkpoint claim of "re-housed in webdev asset storage" apparently applied to something else (maybe ambient sounds handled in a different way, or was only partially done).
- dist/public contains NO assets/ directory. client/public has no assets either.

## Fix options
1. Re-upload missing assets via `manus-upload-file --webdev` and replace hardcoded /assets/* paths with returned storage URLs (tedious, many files; sounds may break ambient engine relative path logic).
2. Copy the asset files back into client/public/assets/ and rebuild/publish (simplest; but prior checkpoint removed them for deployment SIZE LIMIT — need to check total size vs limit).
3. Hybrid: keep small assets in public, move large sounds to storage.

## Next steps planned
- Locate source asset files (maybe in git history, or earlier session uploads /home/ubuntu/webdev-static-assets/). Check git ls-files for assets and git log for removal commit.
- Decide approach, implement, rebuild, test production again with /tmp/e2e_404.mjs.
- Then checkpoint (auto-publishes) and reply to user.

## Key commands
- node /tmp/e2e_test.mjs <url>  (clean load test; exit 2 = react crash)
- node /tmp/e2e_404.mjs <url>  (lists 404 resource URLs)
- Dev preview URL: https://3000-imtbdo58j1lh8wnjamngs-672e8f19.us4.manus.computer
- Production: https://royscript-qeditcvm.manus.space (auto-publish from checkpoints, domain royscript-qeditcvm)
- GitHub: realdogobon/Project-R01, latest commit a2d20fb
