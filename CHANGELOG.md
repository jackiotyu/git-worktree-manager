## v3.23.3

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.23.2...v3.23.3)

### 🩹 Fixes

- **git:** Simplify main folder retrieval logic ([b8a0627](https://github.com/jackiotyu/git-worktree-manager/commit/b8a0627))

## v3.23.2

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.23.1...v3.23.2)

### 🩹 Fixes

- **path:** Preserve path casing on case-sensitive filesystems ([#48](https://github.com/jackiotyu/git-worktree-manager/pull/48))

### 💅 Refactors

- **folder:** Extract path utility functions and simplify folder URI handling ([e21007a](https://github.com/jackiotyu/git-worktree-manager/commit/e21007a))

## v3.23.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.23.0...v3.23.1)

### 🩹 Fixes

- **util:** Correct method name for case conversion in toSimplePath function ([1e774bf](https://github.com/jackiotyu/git-worktree-manager/commit/1e774bf))
- **folderRoot:** Ensure folder URIs are consistently lowercased for cross-platform compatibility ([70772da](https://github.com/jackiotyu/git-worktree-manager/commit/70772da))

## v3.23.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.22.3...v3.23.0)

### 🩹 Fixes

- **linux:** Fix the issue where the plugin does not work properly under Linux ([#47](https://github.com/jackiotyu/git-worktree-manager/pull/47))

### 🏡 Chore

- **release:** Update pnpm action version in release workflow ([28e6235](https://github.com/jackiotyu/git-worktree-manager/commit/28e6235))

## v3.22.3

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.22.2...v3.22.3)

### 🩹 Fixes

- **command:** Pass DefaultDisplayList to pickWorktree in searchAllWorktreeCmd ([2c382d7](https://github.com/jackiotyu/git-worktree-manager/commit/2c382d7))

## v3.22.2

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.22.1...v3.22.2)

### 🎨 Styles

- **command:** Update icon paths and improve file decoration colors ([ec7dfb2](https://github.com/jackiotyu/git-worktree-manager/commit/ec7dfb2))

## v3.22.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.22.0...v3.22.1)

### 🚀 Enhancements

- **quickPick:** Display file icon by adding resourceUri to workspace pick items ([632940b](https://github.com/jackiotyu/git-worktree-manager/commit/632940b))

### 🩹 Fixes

- **i18n:** Update glob pattern descriptions ([3f010ec](https://github.com/jackiotyu/git-worktree-manager/commit/3f010ec))

### 🏡 Chore

- **release:** Update pnpm action to v4.2.0 in release workflow ([7d8386f](https://github.com/jackiotyu/git-worktree-manager/commit/7d8386f))
- **eslint:** Migrate to eslint 9 ([9f5c12a](https://github.com/jackiotyu/git-worktree-manager/commit/9f5c12a))

## v3.22.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.21.1...v3.22.0)

### 🚀 Enhancements

- Respect vscode git.checkoutType setting ([#43](https://github.com/jackiotyu/git-worktree-manager/pull/43))
- **branch:** Sanitize branch name ([#44](https://github.com/jackiotyu/git-worktree-manager/pull/44))

### 📖 Documentation

- Add Open VSX Downloads badge to README files ([620dd9f](https://github.com/jackiotyu/git-worktree-manager/commit/620dd9f))
- **README:** Update documentation with improved descriptions and configuration details ([2d6ead4](https://github.com/jackiotyu/git-worktree-manager/commit/2d6ead4))

## v3.21.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.21.0...v3.21.1)

### 🩹 Fixes

- **worktree:** Handle undefined main folder path in getRootItems ([5bf36f1](https://github.com/jackiotyu/git-worktree-manager/commit/5bf36f1))

### 📖 Documentation

- Git version requirement ([93a84b1](https://github.com/jackiotyu/git-worktree-manager/commit/93a84b1))

## v3.21.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.20.0...v3.21.0)

### 🩹 Fixes

- **worktree:** Improve symlink copy handling ([9d26c2b](https://github.com/jackiotyu/git-worktree-manager/commit/9d26c2b))

## v3.20.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.19.0...v3.20.0)

### 🚀 Enhancements

- **git:** Use VSCode Git extension's Git path ([c47a78a](https://github.com/jackiotyu/git-worktree-manager/commit/c47a78a))
- **git:** Enhance execBase with Git environment variables ([89f3b72](https://github.com/jackiotyu/git-worktree-manager/commit/89f3b72))

## v3.19.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.18.0...v3.19.0)

### 🚀 Enhancements

- Add $BASE_ROOT variable support and update worktree path template ([e4d5dd8](https://github.com/jackiotyu/git-worktree-manager/commit/e4d5dd8))

### 🤖 CI

- Pnpm cache ([c1f305e](https://github.com/jackiotyu/git-worktree-manager/commit/c1f305e))

## v3.18.0

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.17.2...v3.18.0)

### 🚀 Enhancements

- **worktree:** Enhance file copying with symbolic link support and integrate fast-glob for pattern matching ([#41](https://github.com/jackiotyu/git-worktree-manager/pull/41))

## v3.17.2

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.17.1...v3.17.2)

### 🚀 Enhancements

- **quickpick:** Add move worktree action  in the worktree quick pick menu ([1bfdff7](https://github.com/jackiotyu/git-worktree-manager/commit/1bfdff7))

### 🩹 Fixes

- **treeView:** Refresh favorite data ([4c63bb9](https://github.com/jackiotyu/git-worktree-manager/commit/4c63bb9))

### 🏡 Chore

- **ignore:** Update eslint and vscode ignore files ([3174340](https://github.com/jackiotyu/git-worktree-manager/commit/3174340))

## v3.17.1

[compare changes](https://github.com/jackiotyu/git-worktree-manager/compare/v3.17.0...v3.17.1)

### 🚀 Enhancements

- **worktree:** Normalize branch ref names when creating worktrees ([#38](https://github.com/jackiotyu/git-worktree-manager/pull/38))

### 📦 Build

- **deps:** Update dependencies ([d8ca474](https://github.com/jackiotyu/git-worktree-manager/commit/d8ca474))
