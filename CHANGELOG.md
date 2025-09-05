## v3.9.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.8.0...v3.9.0)

### 💅 Refactors

- **l10n:** Update localization files ([1f84b92](https://github.com/jackiotyu/git-worktree-manager/commit/1f84b92))
- **l10n:** Update localization files ([0cbc033](https://github.com/jackiotyu/git-worktree-manager/commit/0cbc033))

## v3.8.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.7.0...v3.8.0)

### 🚀 Enhancements

- Add customizable internal terminal name template ([#34](https://github.com/jackiotyu/git-worktree-manager/pull/34))
- Add `git-worktree-manager.terminalNameTemplate`  configuration option ([8c833a3](https://github.com/jackiotyu/git-worktree-manager/commit/8c833a3))

### 📦 Build

- **release:** Update dependency versions ([37fc7fe](https://github.com/jackiotyu/git-worktree-manager/commit/37fc7fe))

## v3.7.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.6.0...v3.7.0)

### 🚀 Enhancements

- Add customizable worktree description template ([#32](https://github.com/jackiotyu/git-worktree-manager/pull/32))
- Add customizable worktree description template ([#32](https://github.com/jackiotyu/git-worktree-manager/pull/32))

### 🔥 Performance

- **gitFolder:** Initialize data for Git repositories ([aabcc9e](https://github.com/jackiotyu/git-worktree-manager/commit/aabcc9e))

### 🏡 Chore

- Update dependencies to latest versions ([caba381](https://github.com/jackiotyu/git-worktree-manager/commit/caba381))
- Update .editorconfig and localization files ([5d13a83](https://github.com/jackiotyu/git-worktree-manager/commit/5d13a83))
- Update dependencies ([09193da](https://github.com/jackiotyu/git-worktree-manager/commit/09193da))

## v3.6.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.5.0...v3.6.0)

### 🚀 Enhancements

- **config:** Add postCreateCmd configuration option ([#31](https://github.com/jackiotyu/git-worktree-manager/pull/31))

### 🩹 Fixes

- **command:** Update folder config lookup logic to support path comparison ([fd28f2c](https://github.com/jackiotyu/git-worktree-manager/commit/fd28f2c))
- **command:** Improve folder index lookup by using comparePath function ([7179ec5](https://github.com/jackiotyu/git-worktree-manager/commit/7179ec5))

## v3.5.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.4.0...v3.5.0)

### 🚀 Enhancements

- **config:** Change default value of openInsideFolder to true ([0b8a88a](https://github.com/jackiotyu/git-worktree-manager/commit/0b8a88a))
- **config:** Add worktree subdirectory template configuration ([#30](https://github.com/jackiotyu/git-worktree-manager/pull/30))

### 📦 Build

- **release:** Update Node.js and dependency versions ([65c3635](https://github.com/jackiotyu/git-worktree-manager/commit/65c3635))

## v3.4.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.3.0...v3.4.0)

### 🚀 Enhancements

- **core:** Add configurable worktree path template ([#28](https://github.com/jackiotyu/git-worktree-manager/pull/28))

### 📖 Documentation

- **README:** Update README ([cb5f6a1](https://github.com/jackiotyu/git-worktree-manager/commit/cb5f6a1))
- **README:** Update README ([af5252a](https://github.com/jackiotyu/git-worktree-manager/commit/af5252a))

## v3.3.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.2.0...v3.3.0)

### 💅 Refactors

- **removeWorktreeCmd:** Optimize worktree removal process ([#19](https://github.com/jackiotyu/git-worktree-manager/pull/19))
- **core:** Update confirm modal usage across commands ([#19](https://github.com/jackiotyu/git-worktree-manager/pull/19))

## v3.2.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.1.0...v3.2.0)

### 🚀 Enhancements

- **core:** Add safety check for uncommitted changes in worktree ([#19](https://github.com/jackiotyu/git-worktree-manager/pull/19))

### 💅 Refactors

- **core:** Rename copyFolderPath to copyFilePath ([5020ccb](https://github.com/jackiotyu/git-worktree-manager/commit/5020ccb))

## v3.1.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/i0.0.1...v3.1.0)

## v3.0.2

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.0.1...v3.0.2)

### 🩹 Fixes

- **core:** Remove worktree process ([8e6ecc0](https://github.com/jackiotyu/git-worktree-manager/commit/8e6ecc0))

## v3.0.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.0.0...v3.0.1)

### 🚀 Enhancements

- **core:** Add setting to show favorites by default in quick pick ([8dfbc13](https://github.com/jackiotyu/git-worktree-manager/commit/8dfbc13))

### 🩹 Fixes

- **tree-view:** Fix handling of new worktree created inside workspace ([471a1a6](https://github.com/jackiotyu/git-worktree-manager/commit/471a1a6))

## v3.0.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.3.1...v3.0.0)

### 🚀 Enhancements

- **core:** Add favorite folder feature and support opening workspaces ([#25](https://github.com/jackiotyu/git-worktree-manager/pull/25))

## v2.3.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.3.0...v2.3.1)

### 🩹 Fixes

- **core:** Ensure worktree move runs on the main worktree ([#24](https://github.com/jackiotyu/git-worktree-manager/pull/24))
- **core:** Ensure `cwd` parameter is always provided for worktree creation ([#24](https://github.com/jackiotyu/git-worktree-manager/pull/24))
- **core:** Update worktree commands and optimize refresh logic ([66071d9](https://github.com/jackiotyu/git-worktree-manager/commit/66071d9))

## v2.3.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.2.1...v2.3.0)

### 🚀 Enhancements

- **core:** Add input dialog for moving worktree ([#24](https://github.com/jackiotyu/git-worktree-manager/pull/24))

## v2.2.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.2.0...v2.2.1)

### 🚀 Enhancements

- **core:** Add repository selection for worktree prune ([15fe3b3](https://github.com/jackiotyu/git-worktree-manager/commit/15fe3b3))

### 💅 Refactors

- **git:** Remove unused getNameRevSafe function ([4f71fff](https://github.com/jackiotyu/git-worktree-manager/commit/4f71fff))
- Replace "delete" with "remove" for worktree removal ([4c14dc4](https://github.com/jackiotyu/git-worktree-manager/commit/4c14dc4))

## v2.2.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.1.0...v2.2.0)

### 🩹 Fixes

- **core:** Handle errors in getNameRev function ([7fbd2be](https://github.com/jackiotyu/git-worktree-manager/commit/7fbd2be))

## v2.1.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v2.0.0...v2.1.0)

### 🚀 Enhancements

- **configuration:** Add order property to configuration items ([6be3898](https://github.com/jackiotyu/git-worktree-manager/commit/6be3898))
- **l10n:** Add new translations for Japanese and Traditional Chinese ([a3ef751](https://github.com/jackiotyu/git-worktree-manager/commit/a3ef751))

### 💅 Refactors

- **core:** Format execBase and add locale support ([42abe4c](https://github.com/jackiotyu/git-worktree-manager/commit/42abe4c))

### 🩹 Fixes

- **git:**  improve worktree pruning and related git operations ([4da3d12](https://github.com/jackiotyu/git-worktree-manager/commit/4da3d12))

## v2.0.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v1.1.11...v2.0.0)

### 🚀 Enhancements

- **tree-view:** Add option to display views in Source Control container ([7aad0ac](https://github.com/jackiotyu/git-worktree-manager/commit/7aad0ac))

## [1.1.11] 2025-04-17

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v1.1.10...v1.1.11)

### 🚀 Enhancements

- **core:** Control commit detail display in branch items via git.showReferenceDetails ([cc2f9da](https://github.com/jackiotyu/git-worktree-manager/commit/cc2f9da))
- **quickPick:** Add leading blank to worktree path ([f29afe3](https://github.com/jackiotyu/git-worktree-manager/commit/f29afe3))
- **core:** Enhance commit description and refactoring ([5bf2f22](https://github.com/jackiotyu/git-worktree-manager/commit/5bf2f22))

### 🩹 Fixes

- **quickPick:** Improve branch detection for worktree ([13fdc47](https://github.com/jackiotyu/git-worktree-manager/commit/13fdc47))

## [1.1.10] 2025-04-07

### Change

- Allow removing multiple Git repositories at once.
- Reduce package size.

## [1.1.9] 2025-03-28

### Change

- Optimize worktree item rendering and add loading state.
- Improve tag identification and name revision handling.

## [1.1.8] 2025-03-12

### Change

- Improve worktree view performance.
- Support bare repository.

## [1.1.7] 2025-03-08

### Change

- implement git repository backup functionality
- add progress indicator for folder search

## [1.1.6] 2025-03-06

### Change

- add Force remove option for worktree removal

## [1.1.5] 2025-03-05

### Change

- support cancellation of worktree file copying
- add worktree creation and deletion progress

## [1.1.4] 2025-03-02

### Change

- add branch rename feature
- update README

## [1.1.3] 2025-03-01

### Change

- Improve Traditional Chinese and Japanese localization translations
- Standardize technical terms in Japanese translations
- Optimize Traditional Chinese translation expressions

## [1.1.2] 2025-02-28

### Change

- add search worktree icon and open setting icon to worktree list.
- add option to ignore other worktrees when checking out.
- adjust worktree buttons and update icon.

## [1.0.8] 2025-02-22

### Change

- add file copying functionality when creating worktree (#16)

## [1.0.7] 2025-02-18

### Fix

- Update remove worktree logic to delete associated branch and add delete branch functionality (#14)

## [1.0.6] 2025-02-16

### Fix

- Update branch creation logic to prefer branch name over hash

## [1.0.5] 2025-02-16

### Change

- Add branch prefix support for new branches
- Prevent focus loss when creating a new branch

## [1.0.4] 2025-02-15

### Change

- Add functionality to create new branches (#14)

## [1.0.3] 2025-02-03

### Change

- Change worktree icon color to `terminal.ansiBlue`

## [1.0.2] 2024-12-28

### Change

- Update `workspacePathFormat`

## [1.0.1] 2024-12-18

### Change

- Add custom template for displaying the workspace path (#7)


## [1.0.0] 2024-12-11

### Change

- Release stable version.

## [0.4.9] 2024-12-03

### Change

- Improve performance by keep git repo watchers.
- Add Built-in Git graph for viewing git history.

## [0.4.7] 2024-10-29

### Change

- Improve performance.

## [0.4.5] 2024-06-16

### Change

- Improve performance.
- Optimize the worktree creation process and display recently opened folders.

## [0.4.4] 2024-06-14

### Change

- Add an icon for saving the workspace Git repository and optimize the save logic.
- Fix the annotation tag hash value.

## [0.4.3] 2024-06-11

### Change

- Improve performance and replace some icons.

## [0.4.2] 2024-05-30

### Change

- Add `Open the repository in Source Control view` action.
- Add `git-worktree-manager.worktreePick.showOpenRepository` and `git-worktree-manager.treeView.showOpenRepositoryInTreeItem` configuration.

## [0.4.1] 2024-05-15

### Change

- Add `Toggle output log display` action.
- Add `git-worktree-manager.httpProxy` configuration.

## [0.4.0] 2024-04-23

### Change

- Add `Fetch` action.
- Add color for terminal open with current workspace folder.

## [0.3.9] 2024-03-15

### Change

- Add configuration `git-worktree-manager.openInsideFolder` for open the inside of the folder directly.

## [0.3.8] 2024-02-26

### Change

- Action for add multiple repositories.

## [0.3.7] 2024-02-20

### Change

- Improve add/remove worktree action.
- Change `Add worktree` icon.

## [0.3.6] 2024-02-18

### Change

- Quick add/remove worktree in workspace.
- Update list after workspace folders change.

## [0.3.5] 2024-02-02

### Change

- Show `View git history` button in worktree quick pick for quick actions.
- Show main folder emoji(✨) in worktree quick pick items.

## [0.3.4] 2024-01-08

### Change

- Clean up file watcher when idle to reduce memory footprint.

## [0.3.3] 2024-01-02

### Change

- Improve refresh by watch .git folder's special file change.

## [0.3.2] 2023-12-29

### Change

- Update README and some text.

## [0.3.1] 2023-12-12

### Change

- Show `More Actions...` button in worktree quick pick for quick actions.
- Update README.

## [0.3.0] 2023-12-08

### Change

- Show `Checkout` button in worktree quick pick for checkout branch/tag quickly.

## [0.2.9] 2023-12-05

### Change

- Show `Copy` button in worktree quick pick, configure the template in setting `git-worktree-manager.worktreePick.copyTemplate`.
- Display worktree list of workspace or all git repository in worktree quick pick, configure in setting `git-worktree-manager.worktreePick.defaultDisplayList`.
- Update icon.

## [0.2.8] 2023-12-01

### Change

- Pin the current git repository's worktree in the results of "Find Worktree".
- Show `Add git repository` and `Open Settings` in worktree quick pick.
- Update icon and README.

## [0.2.7] 2023-11-30

### Change

- Improve first processing worktree list by ignore commit diff.
- More action icons in worktree quick pick.

## [0.2.6] 2023-11-10

### Change

- Update icon and README.
- Display git branch status on worktree item.

## [0.2.4] 2023-11-07

### Change

- Auto create tracking branch while checkout branch or create worktree.
- Improve checkout/pull/push progress tips.

## [0.2.3] 2023-11-02

### Change

- Show current folder in quick pick.
- Fixed refresh worktree branch ahead/behind after checkout branch.

## [0.2.0] 2023-10-23

### Change

- Update README.
- Add treeView icons for quick action.
- Improve performance of git branch list data processing.
- Improve treeView presentation.

## [0.1.8] 2023-10-19

### Change

- Update README.
- Quick pull/push commits in remote branch.
- Quick view git history. (current use extension [mhutchie.git-graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph))

## [0.1.5] 2023-10-17

### Change

- Update README.
- Using child_process `spawn` instead of `spawnSync` for better performance.
- Paging `recently opened folders`.

## [0.1.4] 2023-09-19

### Change

- Update README.
- Add `Find Worktree` command. Default keyboard shortcut is `ctrl + shift + r`.
- Add  `Set default open/close` icon for repository manage.

## [0.1.3] 2023-09-16

### Change

- Fixed switch branch on other repository.
- Update README.
- Add `View as List` for repository manage.

## [0.1.2] 2023-09-15

### Change

- Change message prompts level.
- Using vscode Built-in external terminal. It can configure by setting `terminal.external.windowsExec` in windows, other platforms is similar.

## [0.1.1] 2023-09-13

### Change

- Switch any branch, use `git switch --ignore-other-worktrees`.

## [0.0.9] 2023-09-11

### Change

- Add `recently opened folders` view

## [0.0.7] 2023-08-31

### Change

- Change the setting `git-worktree-manager.terminalCmd` to `git-worktree-manager.terminalCmdList`, support multi command now.

## [0.0.6] 2023-08-30

### Change

- Update README.
- Disable the `git-worktree-manager.gitFolders` setting, now save git repository references locally.

## [0.0.5] 2023-08-26

### Change

- Update README.
- add `Add to workspace` command in worktree treeItem context menu.

## [0.0.4] 2023-08-25

### Change

- Quick open terminal.

## [0.0.3] 2023-08-25

### Change

- Add operations for git repository manager.
- Support VsCode version >= 1.60.0.

## [0.0.2] 2023-08-25

### Add

- Adds localization support for Chinese and English.
- Improve worktree treeItem command under git repository folder treeItem.

## [0.0.1] 2023-08-24

### Add

- Initial release.
