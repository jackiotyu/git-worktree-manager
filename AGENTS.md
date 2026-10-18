# Repository Guidelines

## Project Structure & Module Organization

This repository is a TypeScript extension for VS Code. The extension entry point is `src/extension.ts`; shared constants and types are in `src/`. Most implementation lives under `src/core/`, organized by responsibility (for example, Git operations in `src/core/git/` and extension commands in `src/core/command/`). Unit tests are in `src/test/unit/` and generally correspond to the feature or module they cover. Localization files are `package.nls*.json` and `l10n/`; images and other visual assets are in `images/`. Build configuration is at the repository root.

## Build, Test, and Development Commands

Use the repository’s pinned package manager and lockfile: `pnpm install`.

- `pnpm run compile` builds the extension for development with Rspack.
- `pnpm run watch` rebuilds as source files change.
- `pnpm run package` creates the production bundle.
- `pnpm run test:unit` runs the Rstest unit suite; add `--watch` via `pnpm run test:unit:watch` for iterative work.
- `pnpm run check-types` checks TypeScript types with tsrs without emitting files.
- `pnpm run lint` runs Oxlint on `src/` and applies its configured fixes.
- `pnpm run format` formats supported files with Oxfmt.
- `pnpm run format:check` checks formatting without changing files.

## Coding Style & Naming Conventions

Follow the existing TypeScript patterns and keep modules focused within their `src/core/` area. Use Oxfmt for formatting; its settings are in `.oxfmtrc.json`. EditorConfig specifies four-space indentation, LF endings, and a final newline. Use descriptive camelCase names for functions and variables; test files use the `*.test.ts` suffix. Run lint and type checks for changes to implementation code.

## Testing Guidelines

Unit tests use Rstest and live in `src/test/unit/`. Name tests after the behavior or module they exercise (for example, `worktreeSort.test.ts`). Run the relevant unit suite with `pnpm run test:unit`; run `pnpm run check-types` when changing TypeScript types or interfaces. No repository-wide coverage threshold is configured.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style prefixes such as `feat:`, `test:`, `chore(release):`, and `refactor:`; keep subjects concise and action-oriented. Pull requests should explain the user-visible change, note relevant verification, and link related issues. Include screenshots for changes that affect the VS Code interface, and update localization or documentation when the change requires it.

## Configuration & Localization

Keep extension metadata and command contributions in `package.json` consistent with implementation. User-facing strings should follow the existing localization files, including the English and Chinese resources; avoid embedding translated UI text directly in TypeScript.
