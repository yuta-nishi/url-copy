import { describe, expect, it, vi } from 'vitest';

const readFileSyncMock = vi.fn();

vi.mock('fs', () => ({
  default: {
    readFileSync: readFileSyncMock,
  },
}));

describe('plasmoCssPaths', async () => {
  const { default: plasmoCssPaths } = await import('./plasmo-css-paths');

  it('should resolve valid source starting with "data-text:~"', () => {
    const plugin = plasmoCssPaths();
    const resolvedId = plugin.resolveId('data-text:~path/to/file.css');

    expect(resolvedId).toBe('data-text:~path/to/file.css');
  });

  it('should return null for invalid source', () => {
    const plugin = plasmoCssPaths();
    const resolvedId = plugin.resolveId('other-source');

    expect(resolvedId).toBeNull();
  });

  it('should load file content for valid id starting with "data-text:~"', () => {
    readFileSyncMock.mockReturnValue('content of path/to/file.css');
    vi.spyOn(process, 'cwd').mockReturnValue('cwd');

    const plugin = plasmoCssPaths();
    const loadedContent = plugin.load('data-text:~path/to/file.css');

    expect(readFileSyncMock).toHaveBeenCalledWith('cwd/src/path/to/file.css', 'utf-8');
    expect(loadedContent).toBe('content of path/to/file.css');
  });

  it('should return null for invalid id', () => {
    const plugin = plasmoCssPaths();
    const loadedContent = plugin.load('other-id');

    expect(loadedContent).toBeNull();
  });
});
