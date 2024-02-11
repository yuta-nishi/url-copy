import cssText from 'data-text:~/style.css';
import type { PlasmoCSConfig } from 'plasmo';

import { CountButton } from '~/components/CountButton';

export const config: PlasmoCSConfig = {
  matches: ['<all_urls>'],
};

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = cssText;
  return style;
};

const PlasmoOverlay = () => {
  return (
    <div className="fixed right-32 top-32 z-50 flex">
      <CountButton />
    </div>
  );
};

export default PlasmoOverlay;
