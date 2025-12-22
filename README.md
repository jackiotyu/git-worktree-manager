
# Git Worktree Manager for VSCode

[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jackiotyu.git-worktree-manager)](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)
[![GitHub release](https://img.shields.io/github/v/release/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/releases)
[![GitHub Open Issues](https://img.shields.io/github/issues/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/issues)
[![License](https://img.shields.io/github/license/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager)

English | [简体中文](./README.zh-CN.md)

Effortlessly manage Git worktrees in Visual Studio Code! 🚀 Simplify your workflow, work on multiple branches simultaneously, and boost productivity with this powerful extension.

<img src="./images/overview.png" width="800" />

## Support 💖

If you enjoy this extension, consider giving it a [star ⭐](https://github.com/jackiotyu/git-worktree-manager) and sharing it on social platforms like [X.com](https://x.com/intent/post?text=Check%20out%20this%20awesome%20VSCode%20extension%20for%20managing%20Git%20worktrees!!%20https%3A%2F%2Fgithub.com%2Fjackiotyu%2Fgit-worktree-manager)—it really helps!
<table>
  <tr>
    <td align="center">
      <img src="./images/donate/paypal.png" width="200" alt="PayPal Donate"/><br/>
      <b>PayPal</b>
    </td>
    <td align="center">
      <img src="./images/donate/wechat.png" width="200" alt="WeChat Donate"/><br/>
      <b>微信</b>
    </td>
  </tr>
</table>


## Why Git Worktree Manager? 🌟

Tired of juggling branches, stashing changes, or resolving merge conflicts? **Git Worktree Manager** makes parallel development a breeze by leveraging Git worktrees, letting you work on multiple branches in separate directories without leaving VSCode. Whether you’re tackling hotfixes, experimenting with features, or managing complex projects, this extension saves time, reduces friction, and keeps your workspace organized. With seamless integration and intuitive controls, it’s the ultimate tool for developers who want a smoother Git experience.

<video src="./images/manage-multiple-repositories.mp4" controls="controls" width="800" height="450"></video>
> [Manage multiple repositories effortlessly within VSCode.](./images/manage-multiple-repositories.mp4)


### Key Features 🎯
- **Quick Worktree Switching**: Switch between worktrees using `Ctrl+Shift+R` or the Source Control view. 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4" controls="controls" width="800" height="450"></video> 
  > [Switch branches seamlessly with a single command.](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4) 
- **Effortless Worktree Creation**: Create new worktrees without touching the command line. 
  <video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4" controls="controls" width="800" height="450"></video> 
  > [Create a new worktree in seconds.](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4) 
- **Workspace Integration**: Add worktrees to your VSCode workspace for easy access. 
  <video src="./images/add-worktrees-to-workspace.mp4" controls="controls" width="800" height="450"></video> 
  > [Add worktrees to your workspace with a click.](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4) 
- **Favorites Management**: Save frequently used worktrees for quick access. 
  <video src="./images/drop-to-favorites.mp4" controls="controls" width="800" height="450"></video> 
  > [Drop worktrees to favorites for instant access.](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/drop-to-favorites.mp4) 
- **Copy Untracked Files**: Automatically include untracked files when creating a new worktree.
- **Multi-Language Support**: Available in English, Simplified Chinese, Traditional Chinese and Japanese.
- **Customizable Terminal**: Use your preferred terminal (e.g., iTerm on macOS, Git Bash on Windows).

## Getting Started 🚀

1. **Requirements**
   - git version >= 2.40

1. **Install the Extension**:
   - Download from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager).
   - Or search for "Git Worktree Manager" in VSCode’s Extensions view and install.

1. **Quick Start**:
   - Open VSCode in a Git repository.
   - Press `Ctrl+Shift+R` to launch the worktree manager.
   - Create, switch, or delete worktrees using the intuitive interface.

1. **Example Workflow**:
   - Create a new worktree: Select “Create Worktree” and specify a branch.
   - Switch to it instantly via the Source Control view or command palette.
   - Add it to your VSCode workspace to work on multiple branches side by side.
   - Save it to favorites for quick access in the future.

## Configuration ⚙️

Customize your experience:
- **`git-worktree-manager.treeView.toSCM`**: Display worktrees in the Source Control view.
- **`terminal.external.windowsExec`**: Set your preferred terminal (e.g., `"C:\\Program Files\\Git\\bin\\bash.exe"` for Git Bash).
- **`terminal.external.osxExec`**: Use iTerm or another terminal on macOS (e.g., `"iTerm.app"`).

## Contributing 🤝

We love contributions! Here’s how to get involved:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/awesome-idea`).
3. Commit your changes (`git commit -m "Add awesome idea"`).
4. Push to the branch (`git push origin feature/awesome-idea`).
5. Open a Pull Request.

Have ideas? Open an issue with the "enhancement" tag or explore [open issues](https://github.com/jackiotyu/git-worktree-manager/issues).

## License 📜

Distributed under the [MIT License](LICENSE). Use, modify, and share freely!
