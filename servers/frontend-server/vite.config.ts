import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv-esm';
import { installGlobals } from '@remix-run/node';
import { defineRoutesConfig } from '@common-stack/rollup-vite-utils/lib/vite-wrappers/json-wrappers.js';
import tsconfigPaths from 'vite-tsconfig-paths';
import { i18nInternationalizationPlugin } from '@common-stack/rollup-vite-utils/lib/vite-plugins/i18n-internationalization-plugin.js';
import { performCopyOperations, config, loadEnvConfig, directoryName, buildConfig } from './common-config.js';
import virtualImportsPlugin from './vite-plugin-virutal-imports';

// This installs globals such as "fetch", "Response", "Request" and "Headers".
installGlobals();

const packages: string[] = config.modules;

export default defineConfig(({ isSsrBuild }) => {
    console.log('---IS SSR BUILD', isSsrBuild);

    const dotEnvResult = loadEnvConfig();

    return {
        define: {
            __ENV__: JSON.stringify(dotEnvResult?.parsed),
            ...Object.assign(
                ...Object.entries(buildConfig).map(([k, v]) => ({
                    [k]: typeof v !== 'string' ? v : `"${v.replace(/\\/g, '\\\\')}"`,
                    __SERVER__: true,
                    __CLIENT__: false,
                }))
            ),
        },
        plugins: [
            virtualImportsPlugin(),
            i18nInternationalizationPlugin({
                folderName: 'cdm-locales',
                packages: config.modules,
                namespaceResolution: 'basename',
            }),
            remix({
                appDirectory: 'src',
                routes: async (defineRoutes) => {
                    if (process.env.NODE_ENV === 'production') {
                        await performCopyOperations();
                    }
                    const metaJson = await import('./app/sync-meta.json').catch(() => null);
                    return defineRoutes((routeFn) => {
                        defineRoutesConfig(routeFn, {
                            routesFileName: 'routes.json',
                            packages: packages,
                            rootPath: resolve(directoryName, '../..'),
                        }, metaJson);
                    });
                },
            }),
            tsconfigPaths({ ignoreConfigErrors: true }),
        ],
        resolve: {
            alias: {
                '@app': resolve(__dirname, 'app'),
            },
        },
    };
});
