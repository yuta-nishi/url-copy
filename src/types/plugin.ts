import type { Plugin } from 'vite';

//
export interface PlasmoCssPlugin extends Plugin {
  resolveId: (source: string) => string | null;
  load: (id: string) => string | null;
}
