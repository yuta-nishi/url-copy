import { useEffect, useState } from 'react';

import { Icons } from '~/components/icons';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import '~/style.css';

const Options = () => {
  const [missingShortcuts, setMissingShortcuts] = useState<(string | undefined)[]>([]);

  useEffect(() => {
    chrome.commands.getAll((commands) => {
      const missingShortcuts = commands
        .filter(({ shortcut }) => shortcut === '')
        .map(({ name }) => name);
      setMissingShortcuts(missingShortcuts);
    });
  }, []);

  return (
    <>
      {missingShortcuts.length > 0 ? (
        <Alert>
          <Icons.alert_circle className="mt-[6px] h-4 w-4" />
          <AlertTitle>
            <h1 className="text-lg">Shortcut Conflict!</h1>
          </AlertTitle>
          <AlertDescription>
            Some keyboard shortcuts are in conflict.
            <button
              onClick={async () =>
                await chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
              }
              className="text-blue-500 hover:text-blue-300"
            >
              Please review your settings.
            </button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle className="flex items-center gap-3">
            <Icons.check_circle className="h-4 w-4"></Icons.check_circle>
            <h1 className="text-lg">No Shortcut Conflict!</h1>
          </AlertTitle>
        </Alert>
      )}
    </>
  );
};

export default Options;
