# AGENTS.md

## AI Agent Development Guide

This document provides guidance for AI agents (such as Kiro, Claude, ChatGPT, etc.) when developing the Git Worktree Manager extension.

### Project Overview

Git Worktree Manager is a VSCode extension designed to simplify Git worktree management. It allows developers to work on different branches of the same repository in parallel without frequently switching branches or dealing with stash operations.

### Core Features

- **Worktree Management**: Create, delete, and switch Git worktrees
- **Workspace Integration**: Add worktrees to VSCode workspace
- **Favorites System**: Save frequently used worktrees for quick access
- **Multi-language Support**: Supports English, Simplified Chinese, Traditional Chinese, and Japanese
- **Terminal Integration**: Open terminals in specified directories
- **Branch Management**: Create worktrees from branches, switch branches, etc.

### Tech Stack

- **Language**: TypeScript
- **Framework**: VSCode Extension API
- **Build Tool**: Rspack
- **Package Manager**: pnpm
- **Internationalization**: VSCode l10n

### Project Structure

```
├── src/
│   ├── core/           # Core functionality modules
│   ├── constants.ts    # Constants definition
│   ├── extension.ts    # Extension entry point
│   └── types.ts        # Type definitions
├── l10n/              # Internationalization files
├── images/            # Icons and demo videos
├── package.json       # Extension configuration and command definitions
└── dist/              # Build output
```

### Development Guidelines

#### 1. Code Style
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Use meaningful variable and function names
- Add appropriate comments, especially for complex Git operations

#### 2. VSCode Extension Best Practices
- Use `vscode.commands.registerCommand` to register commands
- Define UI elements through the `contributes` section in `package.json`
- Use TreeDataProvider to implement tree views
- Handle async operations and errors properly

#### 3. Git Operations
- Use `child_process` to execute Git commands
- Always check Git command exit codes
- Provide meaningful error messages
- Support path handling for different operating systems

#### 4. Internationalization
- All user-visible strings should be internationalized
- Use `vscode.l10n.t()` for translations
- Maintain translation files in the `l10n/` directory

#### 5. Configuration Management
- Read configuration through `vscode.workspace.getConfiguration()`
- Define configuration items in `package.json`
- Provide reasonable default values

### Common Development Tasks

#### Adding New Commands
1. Define the command in `package.json` under `contributes.commands`
2. Implement command logic in the appropriate module
3. Register the command in `extension.ts` or related modules
4. Add necessary internationalization strings

#### Modifying UI Elements
1. Update the `contributes` configuration in `package.json`
2. Modify the corresponding TreeDataProvider or WebView
3. Update related icons and styles

#### Adding Configuration Items
1. Define in `package.json` under `contributes.configuration`
2. Read using `vscode.workspace.getConfiguration()` in code
3. Add internationalization strings for configuration descriptions

### Testing Guidelines

- Test on different operating systems (Windows, macOS, Linux)
- Test various Git repository states (clean, with uncommitted changes, etc.)
- Verify correct display of internationalized strings
- Test error handling and edge cases

### Debugging Tips

- Use VSCode's Extension Development Host for debugging
- Check extension logs in the "Output" panel
- Use `console.log` or `logger.log` for debug output
- Examine Git command output and error messages

### Release Process

1. Update version number (`package.json`)
2. Update `CHANGELOG.md`
3. Run tests to ensure functionality
4. Build extension package: `vsce package`
5. Publish to VSCode Marketplace

### Contribution Guidelines

- Follow existing code style and architecture
- Add appropriate tests for new features
- Update relevant documentation
- Ensure backward compatibility
- Provide clear PR descriptions

### Useful Resources

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- [VSCode Internationalization Guide](https://code.visualstudio.com/api/pluginapis/localization)
- [Project GitHub Repository](https://github.com/jackiotyu/git-worktree-manager)

### Important Notes

- Always consider cross-platform compatibility
- Handle cases where Git repository doesn't exist or is corrupted
- Provide user-friendly error messages
- Maintain extension performance and responsiveness
- Follow VSCode UX guidelines