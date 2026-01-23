# Tests for: fix/relative-path-handling

## Test Strategy

This fix requires manual testing since it involves VS Code extension behavior with git worktrees in a dev container environment.

## Prerequisites

1. A git repository with worktrees using relative paths in gitdir files
2. VS Code with the extension loaded in development mode
3. A dev container environment (to verify paths work when mounted differently)

## Test Cases

### Test 1: Verify relative paths are resolved

**Setup:**
```bash
# Create a repo with relative-path worktrees
mkdir test-repo && cd test-repo
git init
echo "test" > file.txt && git add . && git commit -m "initial"

# Create worktree with relative paths
mkdir ../test-repo.worktrees
git worktree add ../test-repo.worktrees/feature-branch -b feature-branch

# Convert to relative paths
echo "../test-repo.worktrees/feature-branch/.git" > .git/worktrees/feature-branch/gitdir
echo "gitdir: ../../test-repo/.git/worktrees/feature-branch" > ../test-repo.worktrees/feature-branch/.git
```

**Expected:** `git worktree list` shows relative paths like `../test-repo.worktrees/feature-branch`

**Test:**
1. Open `test-repo` in VS Code with the extension
2. View the worktree list in the extension
3. Click on the worktree to open it

**Expected Result:** The worktree opens in a new window at the correct location

### Test 2: Verify in dev container

**Setup:**
1. Create a `.devcontainer/devcontainer.json` that mounts the parent directory
2. Open the repo in a dev container
3. Ensure the mount maps host paths to different container paths

**Test:**
1. Open the worktree list in the extension
2. Verify worktrees are listed correctly (not showing as prunable)
3. Click to open a worktree

**Expected Result:** Worktree opens correctly despite different host/container path mappings

### Test 3: Verify absolute paths still work

**Setup:**
Use a standard worktree setup with absolute paths in gitdir files

**Test:**
1. View worktree list
2. Click to open worktree

**Expected Result:** Works exactly as before (no regression)

## Automated Test Considerations

The extension doesn't appear to have unit tests for `getWorktreeList.ts`. A unit test could be added:

```typescript
// Hypothetical test
describe('buildWorktreeDetail', () => {
    it('should resolve relative paths to absolute', async () => {
        const item = { worktree: '../repo.worktrees/feature' };
        const cwd = '/home/user/repo';
        const result = await buildWorktreeDetail(item, '/home/user/repo', cwd);
        expect(result.path).toBe('/home/user/repo.worktrees/feature');
    });

    it('should preserve absolute paths', async () => {
        const item = { worktree: '/home/user/repo.worktrees/feature' };
        const cwd = '/home/user/repo';
        const result = await buildWorktreeDetail(item, '/home/user/repo', cwd);
        expect(result.path).toBe('/home/user/repo.worktrees/feature');
    });
});
```
