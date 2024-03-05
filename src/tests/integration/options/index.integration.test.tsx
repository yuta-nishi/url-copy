import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, describe, expect, it, vi } from 'vitest';

import Options from '~/options';

const chromeMock = {
  commands: {
    getAll: vi.fn(),
  },
  tabs: {
    create: vi.fn(),
  },
};

vi.stubGlobal('chrome', chromeMock);

describe('Options', () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders the correct alert when there are missing shortcuts', async () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: '' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    chromeMock.commands.getAll.mockImplementation((cb) => {
      cb(commands);
    });

    render(<Options />);

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();

    const alertTitleElement = screen.getByRole('heading', { level: 1 });
    expect(alertTitleElement).toHaveTextContent('Shortcut Conflict!');

    const alertDescriptionElement = screen.getByText(
      'Some keyboard shortcuts are in conflict.',
    );
    expect(alertDescriptionElement).toBeInTheDocument();

    const reviewSettingsButton = screen.getByRole('button', {
      name: 'Please review your settings.',
    });
    expect(reviewSettingsButton).toBeInTheDocument();

    userEvent.click(reviewSettingsButton);
    await waitFor(() => {
      expect(chromeMock.tabs.create).toHaveBeenCalledWith({
        url: 'chrome://extensions/shortcuts',
      });
    });
  });

  it('renders the correct alert when there are no missing shortcuts', () => {
    const commands: chrome.commands.Command[] = [
      { name: 'command1', shortcut: 'Ctrl+C' },
      { name: 'command2', shortcut: 'Ctrl+V' },
      { name: 'command3', shortcut: 'Ctrl+X' },
    ];
    chromeMock.commands.getAll.mockImplementation((cb) => {
      cb(commands);
    });

    render(<Options />);

    const alertElement = screen.getByRole('alert');
    expect(alertElement).toBeInTheDocument();

    const alertTitleElement = screen.getByRole('heading', { level: 1 });
    expect(alertTitleElement).toHaveTextContent('No Shortcut Conflict!');
  });
});
