# Local verification — 2026-10-27

## Timeout review fix (iteration 5)

- Reproduced REVIEW.md with the actual analyzer, estimator and generated Lua: a 10m stroke at 0.01m/s was accepted as safe with 1000s drawing time but aborted under the old fixed timeout. An accepted 180s wait also failed. Before the controller change, both new executed regressions failed; 11 existing regression cases passed.
- Each target now fixes its deadline once using initial actual 3D distance, incoming draw/move speed, twice nominal travel time, 120s tracking margin, and the full configured wait. It resets on advancing, never on repeated updates.
- `npm run test:run`: **42/42 passed** across four files, using Node 25.5.0. Four new executed Lua cases cover slow drawing with integrated commanded velocities, a slow initial vertical approach and inter-stroke transit, 180s waits at all points, and a stalled slow drawing target. The existing unreachable-target case now checks the exact fixed deadline, relay off, zero velocity and terminal abort.
- `npm run test:desktop`: **passed**, including renderer TypeScript/Vite build, Electron main/preload build and all seven desktop interaction checks. Its actual `editor.png` capture was visually inspected. The first sandbox test attempt failed during esbuild configuration resolution with access denied; approved local execution passed. The initial 3D regression needed a longer simulation horizon to include the slow inter-stroke transit; the final suite passes.
- Logs remain local in the portfolio workspace under `work/audit/drone-run5-*`. This is working-tree verification; no new clean-install/packaged-launch/remote-CI claim follows from these checks. Lua tests use mocked APIs, without SITL or aircraft validation.
- Pre-publication scan covered 19,690 files (about 1.17GB), including ignored/untracked dependencies and binaries, all 37 reachable blobs, and author/committer plus configured commit email metadata. Nineteen pattern hits were reviewed as upstream examples, dependency description contact, PEM serializer delimiters, property names, or binary/CSS/base64/translation substrings. No project credentials, user personal data or sensitive configuration filenames were found; metadata uses GitHub noreply identities. Fresh screenshot inspected for personal data. This dated scan is not a general security guarantee.

## Original iteration 2 evidence

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
