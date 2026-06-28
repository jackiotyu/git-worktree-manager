export const buildSafeArgs = (safeBareRepository: 'all' | 'explicit' | 'none', args?: string[]): string[] => {
    return ['-c', `safe.bareRepository=${safeBareRepository}`, ...(args || [])];
};
