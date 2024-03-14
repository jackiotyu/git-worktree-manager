export * from './folder';
export * from './gitFolder';
export * from './worktree';

import { FolderItem } from './folder';
import { GitFolderItem } from './gitFolder';
import { WorkTreeItem } from './worktree';

export type AllViewItem = WorkTreeItem | GitFolderItem | FolderItem;