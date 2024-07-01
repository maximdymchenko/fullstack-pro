import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv-esm';
import { installGlobals } from '@remix-run/node';
import { copyIfVersionChanged } from '@common-stack/rollup-vite-utils/lib/preStartup/copyIfVersionChanged.js';
import buildConfig from './build.config.mjs';
import configData from './config.json' assert { type: 'json' };

installGlobals();

const directoryName = dirname(fileURLToPath(import.meta.url));

// Function to resolve JSON pointers
function resolvePath(config, path) {
    if (typeof path === 'string' && path.startsWith('$.')) {
        return path.split('.').slice(1).reduce((o, p) => (o ? o[p] : undefined), config);
    }
    return path;
}

function resolveConfigPaths(config) {
    return {
        ...config,
        copyOperations: config.copyOperations.map(op => ({
            ...op,
            destPath: resolvePath(config, op.destPath)
        }))
    };
}

const resolvedConfig = resolveConfigPaths(configData);

function loadEnvConfig() {
    let dotEnvResult;
    if (process.env.NODE_ENV !== 'production') {
        dotEnvResult = dotenv.config({ path: resolve(directoryName, process.env.ENV_FILE) });
        if (dotEnvResult.error) {
            throw dotEnvResult.error;
        }
    }
    return dotEnvResult;
}

async function performCopyOperations() {
    for (const operation of resolvedConfig.copyOperations) {
        try {
            await copyIfVersionChanged(
                operation.packageName,
                resolvedConfig.commonPaths.appPath,
                operation.destPath,
                operation.generateModule,
                operation.symbolicLink
            );
            console.log(`Copy operation for ${operation.packageName} completed successfully.`);
        } catch (err) {
            console.error(`Error in copy process for ${operation.packageName}:`, err);
        }
    }
}

export {
    directoryName,
    loadEnvConfig,
    performCopyOperations,
    buildConfig,
    resolvedConfig as config
};
