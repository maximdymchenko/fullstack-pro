import { vitePlugin as remix } from '@remix-run/dev';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import routesGeneratorPlugin from '@common-stack/vite-routes-plugin';
import { loadRoutesConfig, defineRoutesConfig } from './json-wrapper';

import { generateRemixRoutes } from './src/routes';

const directoryName = dirname(fileURLToPath(import.meta.url));
loadRoutesConfig({
    routesFileName: 'routes.json',
    packages: ['@sample-stack/counter-module-browser'],
    rootPath: resolve(directoryName, '../..'),
});
console.log('--_VIET BASE ', process.cwd());

export default defineConfig({
    plugins: [
        // routesGeneratorPlugin({
        //     routesFileName: 'compute.json',
        //     packages: ['@common-stack/counter-module-browser'],
        // }),
        remix({
            appDirectory: 'src',
            routes: async (defineRoutes) =>
                defineRoutesConfig(defineRoutes, {
                    routesFileName: 'routes.json',
                    packages: ['@sample-stack/counter-module-browser'],
                    rootPath: resolve(directoryName, '../..'),
                }),
        }),
        tsconfigPaths({ ignoreConfigErrors: true }),
    ],
});
