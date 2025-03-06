<a name="readme-top"></a>
<!-- PROJECT LOGO -->
# Git Worktree Manager

[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jackiotyu.git-worktree-manager)](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)
[![GitHub release](https://img.shields.io/github/v/release/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/releases)
[![GitHub Open Issues](https://img.shields.io/github/issues/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/issues)
[![License](https://img.shields.io/github/license/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager)

[English](./README.md) | 简体中文

<!-- ABOUT THE PROJECT -->
无缝切换分支，保持代码井然有序，轻松跨多个目录运行——简化你的开发流程。

<img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/overview.png" width="800" />

如果这个插件帮到了你，请点个 [star ⭐](https://github.com/jackiotyu/git-worktree-manager) 吧

### 为何需要 Git Worktree Manager?
1. **在多个分支间切换可能非常繁琐，容易导致冲突或遗忘提交。Git Worktree Manager 帮助开发者在不同工作目录间快速切换，简化分支管理。**

2. **有时需要同时处理不同版本的代码，但切换分支或提交非常耗时。通过使用 worktree，你可以在独立目录中并行开发，不会相互干扰。**


<details>
  <summary>Git Worktree工作原理</summary>
  <section>
    <img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/how-worktree-works.png" width="800" />
    <p>Git worktree 让你无需离开当前工作区，轻松处理跨分支和提交的多个任务——完美适用于管理复杂项目。

使用 git worktree，你可以创建额外的工作目录，并将它们与不同的分支或提交关联。这样做的好处是可以在不切换分支的情况下同时进行多个任务，方便开发人员处理不同的代码版本。

通过创建一个新的工作目录，我们可以在当前目录和新的工作目录之间切换，而每个目录都可以与不同的分支或提交关联。这使得你可以在每个目录中独立执行 Git 操作，如提交代码、拉取更新等，互不影响。

总结来说，git worktree 提供了一种灵活的方式来管理多个任务或版本，提升开发效率。</p>
  </section>
</details>


<!-- 快速上手 -->
## 快速上手

1. 在 VSCode [扩展市场](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)中安装
1. 按下 `Ctrl + Shift + R` 开始操作

## 使用要求

* git 版本 >= 2.30

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>


<!-- USAGE EXAMPLES -->
## 用法

1. [创建 worktree](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4" controls="controls" width="800" height="450"></video>

2. [切换分支/标记](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4" controls="controls" width="800" height="450"></video>

3. [管理多个仓库](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4" controls="controls" width="800" height="450"></video>

4. [向工作区添加 worktree 目录](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4" controls="controls" width="800" height="450"></video>

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>

## 技巧

1. 外部终端设置
    - 打开外部终端时，可以自定义打开的终端应用。在 windows 上可以通过 `terminal.external.windowsExec` 配置启用的终端，其他平台类似。
    ```json
    {
      "terminal.external.osxExec": "iTerm.app",
      "terminal.external.windowsExec": "C:\\Program Files\\Git\\bin\\bash.exe",
    }
    ```
2. 防止在执行 git pull 后，相同分支的worktree未暂存的代码自动进入暂存区
    - 在 `仓库目录/.git/hooks/post-merge` 脚本文件中添加脚本
    ```sh
    #!/bin/bash

    # 获取当前文件夹路径（Unix系统）
    CURRENT_FOLDER=$(pwd)
    # windows需要去掉下面的注释，启用 crypath 转换路径
    # CURRENT_FOLDER=$(cygpath -w "$(pwd)")

    # 获取当前分支名称
    CURRENT_BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

    # 获取所有 worktree 的列表并逐行处理
    git worktree list --porcelain | grep "worktree" | while read -r LINE; do
        # 提取 worktree 路径
        WORKTREE=$(echo "$LINE" | awk '{print $2}')

        # windows需要去掉下面的注释，启用 crypath 转换路径
        # WORKTREE=$(cygpath -w "$WORKTREE")

        # 如果当前目录路径与 worktree 路径相同，则跳过
        if [ "$CURRENT_FOLDER" = "$WORKTREE" ]; then
            continue
        fi

        # 获取目标 worktree 的分支名称
        TARGET_BRANCH=$(git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" rev-parse --abbrev-ref HEAD)

        # 如果目标 worktree 的分支与当前分支相同，则进行处理
        if [ "$TARGET_BRANCH" = "$CURRENT_BRANCH_NAME" ]; then
            echo "Processing worktree: $WORKTREE on branch: $TARGET_BRANCH"
            git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" reset --merge HEAD
        fi
    done
    ```
    - 这段 post-merge 脚本在 Git 合并操作后，通过将匹配的分支重置为合并后的状态，确保多个 Git worktree 的一致性。



<!-- ROADMAP -->
## 路线

- [x] 列出当前文件夹的所有worktree
- [x] 列出当前仓库的所有worktree
- [x] 通过 worktree 文件夹快速打开终端
- [x] 打开最近访问过的文件夹
- [x] 使用`git switch --ignore-other-worktrees` 切换任意分支
- [x] 切换消息提示等级
- [x] 访问 git 历史
- [x] 展示 git 分支状态
- [x] 拉取/推送分支
- [x] 在工作区内添加/删除指定 worktree 目录
- [x] 切换分支或者创建 worktree 时支持新建分支 (#14)
- [x] 创建 worktree 时支持复制主仓库中 git 未跟踪的文件 (#16)
- [ ] git 仓库快照
- [ ] 多语言支持
    - [x] 中文
    - [x] 繁体中文
    - [x] 日语

点击 [打开议题](https://github.com/jackiotyu/git-worktree-manager/issues) 查看所有功能建议（和已知问题）

<p align="right">(<a href="#readme-top">回到顶部</a>)</p>



<!-- CONTRIBUTING -->
## 参与贡献


参与贡献使开源社区成为学习、启发和创造的绝佳场所。**非常感谢**你做出的任何贡献。  

如果你有任何建议可以改进项目，欢迎你 fork 该项目并创建一个 pull request。你也可以直接打开一个带有 "enhancement" 标签的 issue。   
别忘了给这个项目加个星标！再次感谢！

1. Fork 该项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

<!-- LICENSE -->
## License

以 MIT 许可证发布。有关更多信息，请查看 [LICENSE](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE)


<!-- CONTACT -->
## 联系方式

Jackiotyu - 2504448153@qq.com

项目链接: [https://github.com/jackiotyu/git-worktree-manager](https://github.com/jackiotyu/git-worktree-manager)


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
