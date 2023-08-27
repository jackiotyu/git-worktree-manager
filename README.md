<a name="readme-top"></a>


<!-- PROJECT SHIELDS -->
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/jackiotyu/git-worktree-manager">
    <img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/icon.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Git Worktree Manager</h3>

  <p align="center">
    This plugin is designed for managing Git Worktree and provides several functionalities within VS Code. It allows you to list all the Worktrees and quickly switch to a specific one. Additionally, it enables you to directly open the terminal and run commands in the corresponding directory.
    <br />
    该插件用于管理 Git Worktree，在 VS Code 中提供了一些功能。它可以列出所有的 Worktree，并且可以快速切换到指定的 Worktree。另外，在对应的目录上，它还可以直接打开终端运行命令。
    <br />
    <a href="https://github.com/jackiotyu/git-worktree-manager"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <!-- <a href="https://github.com/jackiotyu/git-worktree-manager">View Demo</a> -->
    <!-- · -->
    <a href="https://github.com/jackiotyu/git-worktree-manager/issues">Report Bug</a>
    ·
    <a href="https://github.com/jackiotyu/git-worktree-manager/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
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



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://github.com/jackiotyu/git-worktree-manager)

This plugin aims to provide convenient switching between multiple workspaces, facilitate shared Git commit information, and support running code simultaneously in different directories.
该插件旨在提供便捷的多工作区切换功能，并实现共享 Git 提交信息，同时支持在不同目录上同时运行代码。

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started
## 快速开始

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager).
在VSCode[插件市场](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)中安装
1. Find the `Git Worktree Manager` <image width="16" height="16" src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/icon.png"> panel in activitybar.
在侧栏上找到`Git Worktree Manager` <image width="16" height="16" src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/icon.png"> 面板
1. Performing various quick operations of git worktree on the panel
在面板上执行各种 git worktree 快速操作

### Requirements
### 要求

* git version >= 2.30 for best performance.
* 建议安装版本号不低于2.30的git

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

1. Worktree manager. 管理 worktree

![create-worktree](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/create-worktree.png)
- Click the `Add worktree` icon, then following the tips to make a new worktree.
点击 `添加 worktree` 图标，跟随提示进行操作，添加新的 worktree。
- It provides some useful command in context menu. You can open a new window for a worktree when click worktree item.
右键上下文菜单中提供了一下方便的命令。可以点击 worktree 项直接在新窗口打开 worktree。

2. Git repository manger.  git 仓库管理
![save-repository](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/save-repository.png)
- Click the `Add git repository` icon, then following the tips to save a git repository.
- 点击 `添加 git 仓库` 图标，跟随提示进行操作，添加一个 git 仓库。
- Also provider some quick operation in context menu and inline icon.
- 右键上下文菜单和行内图标也可以执行一下快速操作。
- List all worktree in every repository.
- 每个仓库都会列出所有 worktree。

3. Setting. 设置
![open-setting](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/open-setting.png)
- Open setting quickly by click this button.
- 点击这个按钮快速打开设置
![setting-detail](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/setting-detail.png)
- Managing settings, for example, providing a terminal command that can be quickly executed in the right-click context menu of the worktree item, called "Open VSCode Integrated Terminal" command.
- 管理设置，例如提供终端命令，可以在点击 worktree 项的右键上下文菜单`打开VSCode内置终端`命令中快速运行该命令。

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] List all worktree in current folder.
- [x] List all repository's worktree.
- [x] Quick open terminal in select worktree folder.
- [ ] Multi-language Support
    - [x] Chinese

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
[product-screenshot]: https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.0.5/images/overview.png