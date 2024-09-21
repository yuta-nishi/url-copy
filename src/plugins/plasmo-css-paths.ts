import fs from 'node:fs';
import path from 'node:path';

import type { PlasmoCssPlugin } from '~/types/plugin';

const plasmoCssPaths = (): PlasmoCssPlugin => {
  return {
    name: 'plasmo-css-paths',
    enforce: 'pre',
    resolveId: (source) => {
      if (source.startsWith('data-text:~')) {
        return source;
      }
      return null;
    },
    load: (id) => {
      if (id.startsWith('data-text:~')) {
        const realPath = id.slice('data-text:~'.length);
        return fs.readFileSync(path.join(process.cwd(), 'src', realPath), 'utf-8');
      }
      return null;
    },
  };
};

export default plasmoCssPaths;
