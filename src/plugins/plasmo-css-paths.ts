import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const plasmoCssPaths = (): Plugin => {
  return {
    name: 'plasmo-css-paths',
    enforce: 'pre',
    resolveId(source) {
      if (source.startsWith('data-text:~')) {
        return source;
      }
      return null;
    },
    load(id) {
      if (id.startsWith('data-text:~')) {
        const realPath = id.slice('data-text:~'.length);
        return fs.readFileSync(path.join(process.cwd(), 'src', realPath), 'utf-8');
      }
      return null;
    },
  };
};

export default plasmoCssPaths;
