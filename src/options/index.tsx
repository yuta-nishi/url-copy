import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
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

  // TODO: add styling
  return (
    <div className="flex h-screen items-center justify-center">
      {missingShortcuts.length > 0 ? (
        <>
          <p>ショートカットが競合しています</p>
          <Button
            onClick={() => {
              chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            }}
          >
            settings
          </Button>
        </>
      ) : (
        <p>ショートカットが競合していません</p>
      )}
    </div>
  );
};

export default Options;
