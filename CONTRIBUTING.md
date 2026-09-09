# Contributing to Pulse

This guide makes the quality checks reproducible from a fresh clone. All commands
are run from the repository root.

## Prerequisites

- Node.js **20 or 22** (SDK 54 / Expo tooling target Node ≥ 20; see `netlify.toml`)
- npm (tested with npm 11)

## Install

Install exactly what is recorded in `package-lock.json` (reproducible):

```sh
npm ci
```

> Use `npm ci` (not `npm install`) to guarantee a clean, lockfile-only install
> and to surface any lockfile/spec drift.

## Quality checks

| Command | What it does |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` — TypeScript type-checking (no output emitted) |
| `npm run lint` | `eslint .` — lint with `eslint-config-expo` (flat config, TS/TSX aware). Does **not** auto-fix source |
| `npm test` | `jest` — run the Jest test suite |
| `npm run build:web` | `expo export --platform web` — static web export into `dist/` |
| `npm run expo:doctor` | `expo-doctor` — check the project for known Expo/SDK issues |

Run the full gate locally before pushing:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build:web
```

## CI

`.github/workflows/ci.yml` runs the same gate on every push to `main` and on pull
requests: lockfile install → typecheck → lint → test → web export.

## Notes

- `lint` does not auto-fix. Fix reported problems manually; do not add `--fix`.
- `expo:doctor` is advisory. It may exit non-zero when installed dependencies are
  slightly out of band for the SDK (see `npx expo install --check`). It is not
  part of the CI gate.
- Exact versions are pinned in `package.json` / `package-lock.json`
  (e.g. `eslint-config-expo@~10.0.0`, `expo-doctor@~1.13.3`) to match this
  project's Expo SDK 54 baseline. Do not upgrade these to the latest major
  version without bumping the Expo SDK first.