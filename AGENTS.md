# AGENTS.md

## Must Do

- Extension config: `Config` (`@/core/config/setting.ts`); new keys sync `package.json` + `Config.get()` overload/`defaultValue` + `l10n/`
- State: `GlobalState` / `WorkspaceState` — not `context.globalState` directly
- User messages: `Alert.show*Message`
- Git: `src/core/git/` via `exec` / `execAuto`
- Log: `logger` (`@/core/log/logger`)
- i18n: `vscode.l10n.t()` in code, `%key%` in `package.json`, translations in `l10n/bundle.l10n.{zh-cn,zh-tw,ja}.json`
- Tree UI: fire events in `@/core/event/events.ts` after data changes; single item via `TreeViewManager.updateWorktreeView` / `updateGitFolderView`
- Worktree create: `createWorktreeFromInfo`; lock/unlock/repair: `commonWorktreeCmd`

## Must Not Do

- `getConfiguration('git-worktree-manager')` — `Config` only (`getConfiguration('git')` for built-in git extension is OK)
- `window.show*Message`, `console.log`, raw `spawn git`
- Logic in `extension.ts` beyond `bootstrap()`
- Refresh tree/cache by touching `TreeDataProvider` or calling cache updaters directly — use events (handlers are debounced 1s)
- Hardcoded user-visible strings — use i18n
