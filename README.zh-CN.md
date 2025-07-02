# VSCode Git Worktree Manager



[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jackiotyu.git-worktree-manager)](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)
[![GitHub release](https://img.shields.io/github/v/release/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/releases)
[![GitHub Open Issues](https://img.shields.io/github/issues/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/issues)
[![License](https://img.shields.io/github/license/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager)

简体中文 | [English](./README.md)

在 Visual Studio Code 中轻松管理 Git 工作树！🚀 简化工作流程，同时处理多个分支，提升生产力。这个扩展让 Git 管理变得更简单、更高效！

<img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/overview.png" width="800" />

如果这个插件帮到了你，请点个 [star ⭐](https://github.com/jackiotyu/git-worktree-manager) 吧！

## 为什么选择 Git Worktree Manager？🌟

厌倦了频繁切换分支、暂存更改或解决合并冲突？**Git Worktree Manager** 通过 Git 工作树功能，让您在不同目录中同时处理多个分支，无需离开 VSCode。无论是修复紧急问题、开发新功能还是管理复杂项目，这款扩展都能节省时间、减少麻烦，让您的工作区井然有序。凭借无缝集成和直观的操作，它是追求高效 Git 工作流的开发者的理想选择！

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4" controls="controls" width="800" height="450"></video> 
> [在 VSCode 中轻松管理多个仓库。](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4)

### 核心功能 🎯
- **快速切换工作树**：使用 `Ctrl+Shift+R` 或源代码管理视图快速切换工作树。 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4" controls="controls" width="800" height="450"></video> 
  > [一键无缝切换分支。](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4) 
- **轻松创建工作树**：无需命令行，直接在 VSCode 中创建工作树。 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4" controls="controls" width="800" height="450"></video> 
  > [几秒钟内创建新工作树。](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4) 
- **工作区集成**：将工作树添加到 VSCode 工作区，轻松访问。 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4" controls="controls" width="800" height="450"></video> 
  > [一键将工作树添加到工作区。](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4) 
- **收藏夹管理**：保存常用工作树，方便快速访问。 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@3.1.0/images/drop-to-favorites.mp4" controls="controls" width="800" height="450"></video> 
  > [将工作树拖入收藏夹，随时访问。](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@3.1.0/images/drop-to-favorites.mp4) 
- **复制未跟踪文件**：创建工作树时自动复制主仓库的未跟踪文件。
- **多语言支持**：支持英语、简体中文、繁体中文和日语。
- **自定义终端**：支持 macOS 的 iTerm 或 Windows 的 Git Bash 等终端。

## 快速上手 🚀

1. **安装扩展**：
   - 从 [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager) 下载。
   - 或在 VSCode 扩展视图中搜索 "Git Worktree Manager" 并安装。

2. **快速开始**：
   - 在 Git 仓库中打开 VSCode。
   - 按 `Ctrl+Shift+R` 启动工作树管理器。
   - 使用直观界面创建、切换或删除工作树。

3. **示例工作流**：
   - 创建新工作树：选择“创建工作树”并指定分支。
   - 通过源代码管理视图或命令面板即时切换。
   - 将工作树添加到 VSCode 工作区，同时处理多个分支。
   - 保存到收藏夹以便日后快速访问。

## 配置 ⚙️

自定义您的体验：
- **`git-worktree-manager.treeView.toSCM`**：在源代码管理视图中显示工作树。
- **`terminal.external.windowsExec`**：设置首选终端（例如，Windows 的 Git Bash：`"C:\\Program Files\\Git\\bin\\bash.exe"`）。
- **`terminal.external.osxExec`**：在 macOS 上使用 iTerm 等终端（例如，`"iTerm.app"`）。

## 贡献 🤝

我们欢迎贡献！参与方式：
1. 克隆仓库。
2. 创建功能分支（`git checkout -b feature/awesome-idea`）。
3. 提交更改（`git commit -m "添加新功能"`）。
4. 推送分支（`git push origin feature/awesome-idea`）。
5. 提交 Pull Request。

有好主意？请在 [issues](https://github.com/jackiotyu/git-worktree-manager/issues) 中创建“enhancement”标签的问题。

## 许可证 📜

采用 [MIT 许可证](LICENSE) 分发，欢迎自由使用、修改和分享！