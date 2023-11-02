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
- Using vscode built-in external terminal. It can configure by setting `terminal.external.windowsExec` in windows, other platforms is similar.

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
