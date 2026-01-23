# Change Name: fix/relative-path-handling

## Summary

Fix handling of relative worktree paths (starting with `..`) that occur when git worktree gitdir files use relative paths. This is common in dev container environments where absolute paths differ between host and container.

When `git worktree list --porcelain` returns relative paths like `../repo.worktrees/branch-name`, the extension passes these directly to `vscode.Uri.file()`, which expects absolute paths. This causes the `..` prefix to be incorrectly handled/truncated.

## Problem

1. `git worktree list --porcelain` returns paths exactly as stored in gitdir files
2. When gitdir uses relative paths, the worktree path is relative (e.g., `../repo.worktrees/foo`)
3. `vscode.Uri.file()` expects absolute paths and mishandles relative paths with `..`
4. Result: worktree directories fail to open or open wrong location

## Solution

Resolve relative paths to absolute in `getWorktreeList.ts` before returning the worktree details.

## Annotated Diffs

### Commit 1: fix: resolve relative worktree paths to absolute

Purpose: Ensure worktree paths are always absolute before being used with vscode.Uri.file()

`src/core/git/getWorktreeList.ts`
```diff
 import folderRoot from '@/core/folderRoot';
 import { execBase } from '@/core/git/exec-base';
 import { getNameRev } from '@/core/git/getNameRev';
 import { getMainFolder } from '@/core/git/getMainFolder';
 import type { IWorktreeDetail, IWorktreeOutputItem } from '@/types';
 import logger from '@/core/log/logger';
+import path from 'path';
```

### Commit 2: fix: pass cwd to buildWorktreeDetail for path resolution

Purpose: Provide the working directory context needed to resolve relative paths

`src/core/git/getWorktreeList.ts`
```diff
-async function buildWorktreeDetail(item: IWorktreeOutputItem, mainFolder: string): Promise<IWorktreeDetail> {
+async function buildWorktreeDetail(item: IWorktreeOutputItem, mainFolder: string, cwd: string): Promise<IWorktreeDetail> {
```

### Commit 3: fix: resolve relative worktree path using cwd

Purpose: Convert relative paths to absolute using path.resolve()

`src/core/git/getWorktreeList.ts`
```diff
 async function buildWorktreeDetail(item: IWorktreeOutputItem, mainFolder: string, cwd: string): Promise<IWorktreeDetail> {
     const branchName = item.branch?.replace('refs/heads/', '') || '';
+
+    // Resolve relative paths (e.g., ../repo.worktrees/branch) to absolute
+    const worktreePath = path.isAbsolute(item.worktree)
+        ? item.worktree
+        : path.resolve(cwd, item.worktree);

     let nameRev = '';
-    if (!branchName) nameRev = (await getNameRev(item.worktree)).trim();
+    if (!branchName) nameRev = (await getNameRev(worktreePath)).trim();
```

### Commit 4: fix: use resolved path for isMain comparison and return value

Purpose: Update remaining usages to use the resolved absolute path

`src/core/git/getWorktreeList.ts`
```diff
-    const isMain = item.worktree.trim() === mainFolder;
+    const isMain = worktreePath.trim() === mainFolder;
     const isBranch = Boolean(branchName);
     const detached = Reflect.has(item, 'detached');
     const prunable = Reflect.has(item, 'prunable');
```

```diff
     return {
         name,
-        path: item.worktree,
+        path: worktreePath,
         isBare,
```

### Commit 5: fix: update getWorktreeList to pass cwd to buildWorktreeDetail

Purpose: Wire up the cwd parameter in the calling code

`src/core/git/getWorktreeList.ts`
```diff
-        return await Promise.all(worktreeList.map((item) => buildWorktreeDetail(item, mainFolder)));
+        return await Promise.all(worktreeList.map((item) => buildWorktreeDetail(item, mainFolder, cwd)));
```
