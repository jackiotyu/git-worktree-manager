<a name="readme-top"></a>
<!-- PROJECT LOGO -->
# Git Worktree Manager

[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jackiotyu.git-worktree-manager)](https://marketplace.visualstudio.com/items?itemName=jackiotyu.git-worktree-manager)
[![GitHub release](https://img.shields.io/github/v/release/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/releases)
[![GitHub Open Issues](https://img.shields.io/github/issues/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/issues)
[![License](https://img.shields.io/github/license/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/jackiotyu/git-worktree-manager)](https://github.com/jackiotyu/git-worktree-manager)

English | [简体中文](./README.zh-CN.md)

<!-- ABOUT THE PROJECT -->
Seamlessly switch between branches, keep your code organized, and run code across multiple directories—simplifying your workflow.

<img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/overview.png" width="800" />

If you enjoy this extension, consider giving it a [star ⭐](https://github.com/jackiotyu/git-worktree-manager) and sharing it on social platforms like [X.com](https://x.com/intent/post?text=Check%20out%20this%20awesome%20VSCode%20extension%20for%20managing%20Git%20worktrees!!%20https%3A%2F%2Fgithub.com%2Fjackiotyu%2Fgit-worktree-manager)—it really helps!

### Why Git Worktree Manager?
1. **Switching between multiple branches can be cumbersome and may lead to conflicts or forgotten commits. Git Worktree Manager helps developers quickly switch between different working directories, simplifying branch management**

2. **Sometimes you need to work with different versions of code simultaneously, but switching branches or commits can be time-consuming. With worktrees, you can develop in parallel across separate directories without interference**


<details>
  <summary>How Git Worktree Works.</summary>
  <section>
    <img src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/how-worktree-works.png" width="800" />
    <p>Git worktree lets you effortlessly juggle multiple tasks across branches and commits without ever needing to leave your current workspace—ideal for managing complex projects.

With git worktree, you can create extra working directories linked to different branches or commits. The benefit of this is that you can work on multiple tasks without switching branches, making it convenient for developers to handle different versions of the code.

By creating a new working directory, we can switch between the current directory and the new one, each associated with different branches or commits. This allows you to perform Git operations such as committing, pulling updates, and more in each directory, independently of the others.

In summary, git worktree offers a flexible way to manage multiple tasks or versions, boosting development efficiency.</p>
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
1. Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to start.

## Requirements

* git version >= 2.30

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- USAGE EXAMPLES -->
## Usage

1. [Create Worktree](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/create-worktree.mp4" controls="controls" width="800" height="450"></video>

2. [Checkout Branch](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/switch-branch.mp4" controls="controls" width="800" height="450"></video>

3. [Manage multiple repositories](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/manage-multiple-repositories.mp4" controls="controls" width="800" height="450"></video>

4. [Add worktrees to workspace](https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4)

<video src="https://cdn.jsdelivr.net/gh/jackiotyu/git-worktree-manager@0.4.6/images/add-worktrees-to-workspace.mp4" controls="controls" width="800" height="450"></video>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Note

1. External Terminal settings.
    - When opening an external terminal, you can customize the terminal application to be launched. On Windows, you can configure the enabled terminal using `terminal.external.windowsExec`, with similar settings available on other platforms.
    ```json
    {
      "terminal.external.osxExec": "iTerm.app",
      "terminal.external.windowsExec": "C:\\Program Files\\Git\\bin\\bash.exe",
    }
    ```
2. Prevent unstaged code from the worktree of the same branch from automatically entering the staging area after git pull is executed.
    - Add git post-merge script in `your-repo/.git/hook/post-merge`.
    ```sh
    #!/bin/bash

    # Get the current directory path (Unix system)
    CURRENT_FOLDER=$(pwd)
    # Uncomment the following line to enable cygpath on Windows (Cygwin).
    # CURRENT_FOLDER=$(cygpath -w "$(pwd)")

    # Get the current Git branch name
    CURRENT_BRANCH_NAME=$(git rev-parse --abbrev-ref HEAD)

    # Get the list of all worktrees and process each line.
    git worktree list --porcelain | grep "worktree" | while read -r LINE; do
        # Extract the worktree path.
        WORKTREE=$(echo "$LINE" | awk '{print $2}')

        # Uncomment the following line to enable cygpath on Windows (Cygwin).
        # WORKTREE=$(cygpath -w "$WORKTREE")

        # If the current directory path matches the worktree path, skip it.
        if [ "$CURRENT_FOLDER" = "$WORKTREE" ]; then
            continue
        fi

        # Get the branch name of the target worktree.
        TARGET_BRANCH=$(git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" rev-parse --abbrev-ref HEAD)

        # If the target worktree's branch matches the current branch, process it.
        if [ "$TARGET_BRANCH" = "$CURRENT_BRANCH_NAME" ]; then
            echo "Processing worktree: $WORKTREE on branch: $TARGET_BRANCH"
            git --work-tree="$WORKTREE" --git-dir="$WORKTREE/.git" reset --merge HEAD
        fi
    done
    ```
    - This post-merge script ensures consistency across multiple Git worktrees by resetting any matching branch to its merged state after a merge operation.



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
- [x] Create new branches while creating worktree or switching branch. (#14)
- [x] Copy untracked files from the main repository when creating a worktree. (#16)
- [x] Git repository snapshot (backup).
- [ ] Multi-language Support.
    - [x] Simplified Chinese
    - [x] Traditional Chinese
    - [x] Japanese

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

<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE](https://github.com/jackiotyu/git-worktree-manager/blob/main/LICENSE) for more information.

<!-- CONTACT -->
## Contact

Jackiotyu - 2504448153@qq.com

Project Link: [https://github.com/jackiotyu/git-worktree-manager](https://github.com/jackiotyu/git-worktree-manager)


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
