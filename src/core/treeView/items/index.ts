export * from './folder';
export * from './gitFolder';
export * from './worktree';
export * from './file';

import { FolderItem } from './folder';
import { GitFolderItem } from './gitFolder';
import { WorktreeItem } from './worktree';

export type AllViewItem = WorktreeItem | GitFolderItem | FolderItem;
