import { resolve } from 'path';

export default function virtualImportsPlugin() {
  return {
    name: 'virtual-imports',
    resolveId(source) {
      if (source.startsWith('virtual:')) {
        return source; // treat it as resolved
      }
      return null; // other ids should be handled as usually
    },
    load(id) {
      if (id.startsWith('virtual:')) {
        const moduleName = id.slice('virtual:'.length);
        switch (moduleName) {
          case 'module': // Handle virtual:module
            return `
              import feature, { plugins } from '${resolve(__dirname, 'app/frontend-stack-react/modules.js')}';
              export default feature;
              export { plugins };
            `;
          default:
            return null;
        }
      }
      return null; // other ids should be handled as usually
    }
  };
}
