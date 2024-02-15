import type { PlasmoCSConfig, PlasmoGetStyle } from 'plasmo';
import { useEffect, useState } from 'react';

// Add tailwind css for shadcn/ui components
// Without this, shadcn/ui components will not be displayed correctly
import '~/style.css';

import cssText from 'data-text:~/style.css';
import { Toaster } from '~/components/ui/toaster';
import { useToast } from '~/components/ui/use-toast';
import type { Message } from '~/types/message';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
};

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

const Contents = (): JSX.Element => {
  const [notification, setNotification] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (notification) {
      toast({
        description: notification,
      });
      setNotification('');
    }
  }, [notification]);

  navigator.permissions
    .query({ name: 'clipboard-write' as PermissionName })
    .then((res) => {
      if (res.state === 'granted' || res.state === 'prompt') {
        chrome.runtime.onMessage.addListener(
          (message: Message, _sender, _sendResponse) => {
            if (message.type === 'copy') {
              navigator.clipboard.writeText(message.text).then(
                () => {
                  setNotification('Copied Current URL');
                },
                () => {
                  setNotification('Failed to copy');
                },
              );
            }
          },
        );
      }
    });

  return (
    <>
      <Toaster />
    </>
  );
};

export default Contents;
