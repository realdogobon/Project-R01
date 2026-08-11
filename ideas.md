# RoyScript TSR — Migration Design Spec

## Context
This project is a **direct migration** of the user's existing GitHub app `realdogobon/Project-R01`
("RoyScript TSR") — a typing trainer + rich-text workspace. The user is NOT asking for a redesign;
they are asking for a permanent hosted deployment of their existing app.

## Ground-Truth Spec (chosen approach)
- **Replicate the existing app faithfully.** The original design language, colors, fonts, components,
  and behavior of Project-R01 are the ground truth. No new design direction is introduced.
- The app has its own rich visual identity: dual themes (light/dark), Lexical-based workspace editor,
  typing practice modes, exam mode, dashboard, virtual keyboards, clicky sounds, and an AI scanner.
- All app source code lives in the original repo at `/home/ubuntu/Project-R01/src`, entry served by
  `/home/ubuntu/Project-R01/server.ts` (Express + Vite).

## Migration constraints
- Static webdev template: frontend-only deployment. The original app's Express `server.ts` serves the
  Vite app; in production the app is a pure SPA, so we migrate the `src/` tree into
  `client/src/` and adapt entry/routing/assets.
- Assets (logo.png etc.) must be uploaded via `manus-upload-file --webdev` and referenced by URL,
  not bundled locally (deployment timeout risk).
- Features depending on a server (e.g., AI endpoints hitting Google GenAI with server-side keys,
  cron jobs) will need honest placeholders or adaptation since no backend exists in web-static.

## Verification targets
- Workspace editor page renders and types.
- Practice mode, Exam mode, Settings modal, Profile modal render without SmoothInputs (already removed upstream).
- No overlapping cursor issues (SmoothInputs was removed in commit fc42387).
