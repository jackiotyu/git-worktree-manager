<a name="readme-top"></a>

<!-- PROJECT LOGO -->
# Git Worktree Manager

<!-- ABOUT THE PROJECT -->
This extension aims to provide convenient switching between multiple workspaces, facilitate shared Git commit information, and support running code simultaneously in different directories.
该扩展旨在提供便捷的多工作区切换功能，并实现共享 Git 提交信息，同时支持在不同目录上同时运行代码。

<img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.5/images/overview.png" width="800" />

<p align="right">(<a href="#readme-top">back to top</a>)</p>

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
    <li><a href="#note">Note</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <!-- <li><a href="#acknowledgments">Acknowledgments</a></li> -->
  </ol>
</details>


<!-- GETTING STARTED -->
## Getting Started

1. Install the extension from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager).
在 VSCode [扩展市场](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)中安装
1. Press `Ctrl + Shift + R` to start.
按下 `Ctrl + Shift + R` 开始操作

## Requirements

* git version >= 2.30 for best performance.
* 建议安装版本号不低于2.30的git

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- USAGE EXAMPLES -->
## Usage

1. Create Worktree. 创建 worktree

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.5/images/create-worktree.mp4" controls="controls" width="800" height="450"></video>

2. Checkout Branch/tag. 切换分支/标记

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.5/images/switch-branch.mp4" controls="controls" width="800" height="450"></video>

3. Manage multiple repositories. 管理多个仓库

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.5/images/manage-multiple-repositories.mp4" controls="controls" width="800" height="450"></video>

4. Add worktrees to workspace. 向工作区添加 worktree 目录

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.5/images/add-worktrees-to-workspace.mp4" controls="controls" width="800" height="450"></video>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Note

1. External Terminal settings. 外部终端设置
    - When opening an external terminal, you can customize the terminal application to be launched. On Windows, you can configure the enabled terminal using `terminal.external.windowsExec`, with similar settings available on other platforms.
    - 打开外部终端时，可以自定义打开的终端应用。在 windows 上可以通过 `terminal.external.windowsExec` 配置启用的终端，其他平台类似。
    ```json
    {
      "terminal.external.osxExec": "iTerm.app",
      "terminal.external.windowsExec": "C:\\Program Files\\Git\\bin\\bash.exe",
    }
    ```
2. Prevent unstaged code from the worktree of the same branch from automatically entering the staging area after git pull is executed. 防止在执行 git pull 后，相同分支的worktree未暂存的代码自动进入暂存区
    - Add git post-merge script in `your-repo/.git/hook/post-merge`.
    - 在 `仓库目录/.git/hooks/post-merge` 脚本文件中添加脚本
    ```sh
    #!/bin/bash

    # Get the current directory path (Unix system)
    CURRENT_FOLDER=$(pwd)
    # Uncomment the following line to enable cygpath on Windows (Cygwin). windows需要去掉下面的注释，启用 crypath 转换路径
    # CURRENT_FOLDER=$(cygpath -w "$(pwd)")

    # Get the current Git branch name
    CURRENT_BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

    # Get the list of all worktrees and process each line. 获取所有 worktree 的列表并逐行处理
    git worktree list --porcelain | grep "worktree" | while read -r LINE; do
        # Extract the worktree path. 提取 worktree 路径
        WORKTREE=$(echo "$LINE" | awk '{print $2}')

        # Uncomment the following line to enable cygpath on Windows (Cygwin). windows需要去掉下面的注释，启用 crypath 转换路径
        # WORKTREE=$(cygpath -w "$WORKTREE")

        # If the current directory path matches the worktree path, skip it. 如果当前目录路径与 worktree 路径相同，则跳过
        if [ "$CURRENT_FOLDER" = "$WORKTREE" ]; then
            continue
        fi

        # Get the branch name of the target worktree. 获取目标 worktree 的分支名称
        TARGET_BRANCH=$(git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" rev-parse --abbrev-ref HEAD)

        # If the target worktree's branch matches the current branch, process it. 如果目标 worktree 的分支与当前分支相同，则进行处理
        if [ "$TARGET_BRANCH" = "$CURRENT_BRANCH_NAME" ]; then
            echo "Processing worktree: $WORKTREE on branch: $TARGET_BRANCH"
            git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" reset --merge HEAD
        fi
    done
    ```
    - This post-merge script ensures consistency across multiple Git worktrees by resetting any matching branch to its merged state after a merge operation.
    - 这段 post-merge 脚本在 Git 合并操作后，通过将匹配的分支重置为合并后的状态，确保多个 Git worktree 的一致性。



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