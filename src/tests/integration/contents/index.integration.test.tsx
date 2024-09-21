import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Contents from '~/contents';

const chromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
};
const navigatorMock = {
  permissions: {
    query: vi.fn(),
  },
  clipboard: {
    writeText: vi.fn(),
  },
};
const toastMock = vi.fn();

vi.mock('~/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({ toast: toastMock })),
}));
vi.mock('~/components/ui/toaster', () => ({
  Toaster: vi.fn().mockImplementation(() => <div data-testid="mock-toaster" />),
}));
vi.stubGlobal('chrome', chromeMock);
vi.stubGlobal('navigator', navigatorMock);

describe('Contents', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle clipboard write permission and copy message', async () => {
    const textMock = 'some text';
    navigatorMock.permissions.query.mockResolvedValue({ state: 'prompt' });
    navigatorMock.clipboard.writeText.mockResolvedValue(textMock);
    chromeMock.runtime.onMessage.addListener.mockImplementation((cb) => {
      cb({ type: 'copy', text: textMock });
    });
    render(<Contents />);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({ description: 'Copied current URL' });
    });
  });

  it('should handle clipboard write permission and error message', async () => {
    const textMock = 'error text';
    navigatorMock.permissions.query.mockResolvedValue({ state: 'granted' });
    navigatorMock.clipboard.writeText.mockResolvedValue(textMock);
    chromeMock.runtime.onMessage.addListener.mockImplementation((cb) => {
      cb({ type: 'error', text: textMock });
    });
    render(<Contents />);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        description: textMock,
        variant: 'destructive',
      });
    });
  });

  it('should handle clipboard write failure', async () => {
    const textMock = 'error text';
    navigatorMock.permissions.query.mockResolvedValue({ state: 'granted' });
    navigatorMock.clipboard.writeText.mockRejectedValue(new Error(textMock));
    chromeMock.runtime.onMessage.addListener.mockImplementation((cb) => {
      cb({ type: 'copy', text: textMock });
    });
    render(<Contents />);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith({
        description: 'Failed to copy URL',
        variant: 'destructive',
      });
    });
  });

  it('should not execute anything if permission state is not granted or prompt', async () => {
    navigatorMock.permissions.query.mockResolvedValue({ state: 'denied' });
    render(<Contents />);

    await waitFor(() => {
      expect(chromeMock.runtime.onMessage.addListener).not.toHaveBeenCalled();
    });
  });
});
