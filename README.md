<a name="readme-top"></a>

<!-- PROJECT LOGO -->
# Git Worktree Manager

<!-- ABOUT THE PROJECT -->
This extension aims to provide convenient switching between multiple workspaces, facilitate shared Git commit information, and support running code simultaneously in different directories.
该扩展旨在提供便捷的多工作区切换功能，并实现共享 Git 提交信息，同时支持在不同目录上同时运行代码。

![ git worktree manager preview](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/preview.gif)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<details>
  <summary>Overview 概览</summary>
  <img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/overview.png" width="800" />
</details>

<details>
  <summary>How Git Worktree Works. git worktree 工作原理</summary>
  <section>
    <img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/how-worktree-works.png" width="800" />
    <p>Git worktree is a feature of the Git version control system that allows you to work on multiple branches or commits within the same repository.

With git worktree, you can create an additional working directory that can be linked to different branches or commits of the original repository. The benefit of this is that you can work on multiple tasks without switching branches, making it convenient for developers to handle different versions of the code.

By creating a new working directory, we can switch between the current directory and the new one, each associated with different branches or commits. This means that we can perform git operations such as committing code, pulling updates, etc., on each directory without affecting each other.

In summary, git worktree provides a flexible way to manage multiple tasks or versions, making development work more efficient and convenient.</p>
    <p>Git worktree 是 Git 版本控制系统的一个功能，它用于在同一个仓库中同时工作于多个分支或提交。

使用 git worktree 可以创建一个额外的工作目录，这个目录可以连接到原始仓库的不同分支或提交。这样做的好处是可以在不切换分支的情况下同时进行多个任务，方便开发人员处理不同的代码版本。

通过创建一个新的工作目录，我们可以在当前目录和新的工作目录之间切换，而每个目录都可以与不同的分支或提交关联。这意味着我们可以在每个目录上执行 git 操作，例如提交代码、拉取更新等，而不会相互影响。

总结来说，git worktree 提供了一种灵活的方式来管理多个任务或版本，使得开发工作更加高效和便捷。</p>
  </section>
</details>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#requirements">Requirements</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <!-- <li><a href="#acknowledgments">Acknowledgments</a></li> -->
  </ol>
</details>


<!-- GETTING STARTED -->
## Getting Started 快速开始

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager).
在 VSCode [扩展市场](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)中安装
1. Press `Ctrl + Shift + R` to start.
按下 `Ctrl + Shift + R` 开始操作

### Requirements 要求

* git version >= 2.30 for best performance.
* 建议安装版本号不低于2.30的git

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- USAGE EXAMPLES -->
## Usage 使用

1. Worktree manager. 管理 worktree

![create-worktree](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/create-worktree.png)
- Click on the "Add worktree" icon and follow the prompts to add a new worktree.
点击 `添加 worktree` 图标，跟随提示进行操作，添加新的 worktree。
- The right-click context menu provides the following convenient commands. You can click on the worktree item to directly open the worktree in a new window.
- 右键上下文菜单中提供了一下方便的命令。可以点击 worktree 项直接在新窗口打开 worktree。
![open-terminal](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/open-terminal.png)
- Using VSCode built-in external terminal. It can configure by setting `terminal.external.windowsExec` in windows, other platforms is similar.
- 使用 VSCode 自带的外部终端设置。在 windows 上可以通过 `terminal.external.windowsExec` 配置启用的终端，其他平台类似。
```json
{
  "terminal.external.osxExec": "iTerm.app",
  "terminal.external.windowsExec": "C:\\Program Files\\Git\\bin\\bash.exe",
}
```
![pull-commit](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/pull-commit.png)
- Quick pull/push commits in remote branch.
- 快速在远程分支上pull/push提交。
- Quick view git history. (current use extension [mhutchie.git-graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph))
- 快速查看git提交历史. (当前使用扩展 [mhutchie.git-graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph))


2. Git repository manger.  git 仓库管理
![save-repository](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/save-repository.png)
- Click the `Add git repository` icon, then following the tips to save a git repository.
- 点击 `添加 git 仓库` 图标，跟随提示进行操作，添加一个 git 仓库。
- Also provider some quick operation in context menu and inline icon.
- 右键上下文菜单和行内图标也可以执行一下快速操作。
- List all worktree in every repository.
- 每个仓库都会列出所有 worktree。
- Press `Ctrl + Shift + R` to open the worktree list.
- 按下 `Ctrl + Shift + R` 打开 worktree 列表。

3. Setting. 设置
![open-setting](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/open-setting.png)
- Open setting quickly by click this button.
- 点击这个按钮快速打开设置
![setting-detail](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/setting-detail.png)
- Managing settings, for example, providing a terminal command that can be quickly executed in the right-click context menu of the worktree item, called "Open VSCode Integrated Terminal" command.
- 管理设置，例如提供终端命令，可以在点击 worktree 项的右键上下文菜单`打开VSCode内置终端`命令中快速运行该命令。

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] List all worktree in current folder.
- [x] List all repository's worktree.
- [x] Quick open terminal in select worktree folder.
- [x] Quick open recently opened folders.
- [x] Switch any branch, use `git switch --ignore-other-worktrees`.
- [x] Change message prompts level.
- [x] Quick view git history.
- [x] Display git branch status.
- [x] Quick pull/push branch.
- [x] Quick add/remove worktree in workspace.
- [ ] Git repository snapshot.
- [ ] Multi-language Support.
    - [x] Chinese.

See the [open issues](https://github.com/jackiotyu/git-worktree-manager/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Jackiotyu - 2504448153@qq.com

Project Link: [https://github.com/jackiotyu/git-worktree-manager](https://github.com/jackiotyu/git-worktree-manager)

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/jackiotyu/git-worktree-manager.svg?style=for-the-badge
[contributors-url]: https://github.com/jackiotyu/git-worktree-manager/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/jackiotyu/git-worktree-manager.svg?style=for-the-badge
[forks-url]: https://github.com/jackiotyu/git-worktree-manager/network/members
[stars-shield]: https://img.shields.io/github/stars/jackiotyu/git-worktree-manager.svg?style=for-the-badge
[stars-url]: https://github.com/jackiotyu/git-worktree-manager/stargazers
[issues-shield]: https://img.shields.io/github/issues/jackiotyu/git-worktree-manager.svg?style=for-the-badge
[issues-url]: https://github.com/jackiotyu/git-worktree-manager/issues
[license-shield]: https://img.shields.io/github/license/jackiotyu/git-worktree-manager.svg?style=for-the-badge
[license-url]: https://github.com/jackiotyu/git-worktree-manager/blob/master/LICENSE
[product-screenshot]: https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.1.9/images/overview.png