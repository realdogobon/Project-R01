# Exam Progression Integrity — Live Verification

## Scope

This record covers the user-authorized removal of fabricated Exam accuracy and exclusion of Exam records from level/progression XP. It does not cover the separate, still approval-gated training-progression redesign.

## Disposable live fixture

- Account: `Exam Integrity Test` — browser-local and temporary.
- Practice record: 50 WPM, 96% accuracy, 10 minutes.
- Exam record: 70 WPM, no measured accuracy (`null`), 10 minutes.

## Observed result

| Check | Expected | Live result |
|---|---|---|
| Saved Exam record | Preserved | Present in history |
| Exam accuracy | Not fabricated | Rendered as `—`; stored as `null` |
| Average accuracy | Derived only from measured accuracy | `96%` |
| Progression XP | Practice-only | `320 / 1000 XP`, exactly matching the Practice record's current formula contribution |
| Exam speed | Real non-quality data remains visible | `70 WPM` remained visible in history and peak-speed reporting |
| Session history | Both completed records remain auditable | Two rows, with their original run types/durations |

## Restoration

The local browser-state backup was restored after validation. The disposable account and both temporary records were removed. A fresh reload returned to the pre-test workspace with its original two tabs and editor content intact.

## Automated validation

- Full Vitest suite: 9 test files, 53 assertions passed.
- TypeScript: passed with no errors.
- Production build: passed.
