# Local verification — 2026-10-27

Verified on Windows x64 with Node 25.5.0, npm 11.17.0 and Electron 45.0.0:

- `npm run build`: TypeScript and Vite production renderer succeeded.
- `npm run build:main`: CommonJS main/preload compilation succeeded.
- `npm run test:run`: 38 tests passed across four files. Includes execution of generated Lua 5.3 with mocked ArduPilot bindings.
- `npm run test:desktop`: passed render/draw/undo/redo/pointer zoom/analysis/export invalidation checks, then captured `editor.png` from the actual Electron window. Screenshot inspected visually.
- `npm run electron:build`: succeeded; unsigned Windows x64 application folder at `release/verified/win-unpacked`. The packaged executable has not been separately launched; source Electron runtime launch is verified.
- `npm audit`: zero known advisories after toolchain upgrades and compatible transitive fixes. This is a dated registry check, not a security guarantee.

The first native Rollup attempt was blocked by Windows Application Control. The configured official WebAssembly package resolves this without changing security settings. The first Electron capture returned `UnknownVizError`; the smoke test now uses software rendering and passes. Initial NSIS schema failure was resolved by removing the obsolete unused option.

A broad redacted file scan covered 19,689 files / 1,172,903,167 bytes, including ignored/untracked dependencies and release binaries. Pattern hits were reviewed: dotenv truncated documentation examples, webcrypto PEM parser delimiters, `sk-` substrings inside CSS/Chromium identifiers, and `AKIA` substrings embedded in upstream binary/base64 data. No project credential or sensitive configuration file was found. Dependencies, release binaries and audit reports are excluded from git. Authored source/docs were also checked for local user paths/contact data; the license uses the public GitHub handle. No private user data is used by this application.

Fresh local clone verification: `git clone --no-hardlinks` into `work/verification/drone-clean`, then `npm ci`, `npm run test:run`, and `npm run test:desktop` all succeeded. The clone had no node_modules or build output before installation. All 38 tests, both builds, and seven desktop checks passed. Electron downloaded its runtime on first launch. No source files were copied from the installed working tree.

The initial commit's complete reachable history contained 36 blobs; all were scanned for key patterns, private-key markers, local user paths and sensitive filenames, with no findings. A final pre-push scan covers subsequent documentation changes too. The broad file-scan false positives were classified without recording credential values. No original project Git history existed in this source folder.

ArduPilot SITL, flight dynamics, hardware relay behavior, aircraft flight, macOS/Linux runtime, and remote CI execution are **UNVERIFIED**. No flight success, deployment or measured performance claim is made.
