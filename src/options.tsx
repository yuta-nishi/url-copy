import { useEffect, useState } from 'react';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { getMissingShortcuts } from '~/lib/utils';
import '~/style.css';

const Options = () => {
  const [missingShortcuts, setMissingShortcuts] = useState<(string | undefined)[]>([]);

  useEffect(() => {
    chrome.commands.getAll((commands) => {
      const missingShortcuts = getMissingShortcuts(commands);
      setMissingShortcuts(missingShortcuts);
    });
  }, []);

  return (
    <>
      {missingShortcuts.length > 0 ? (
        <Alert>
          <AlertCircle className="mt-[6px] h-4 w-4" />
          <AlertTitle>
            <h1 className="text-lg">Shortcut Conflict!</h1>
          </AlertTitle>
          <AlertDescription>
            Some keyboard shortcuts are in conflict.
            <button
              type="button"
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
            <CheckCircle2 className="h-4 w-4" />
            <h1 className="text-lg">No Shortcut Conflict!</h1>
          </AlertTitle>
        </Alert>
      )}
    </>
  );
};

export default Options;
