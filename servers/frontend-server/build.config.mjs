import { config as dotenvConfig } from 'dotenv-esm';

if (process.env.ENV_FILE !== null) {
    dotenvConfig({ path: process.env.ENV_FILE });
}

const __WEB_SERVER_PORT__ = process.env.LOCAL_BACKEND_URL ? new URL(process.env.LOCAL_BACKEND_URL).port : 3000;
const __WEB_DEV_SERVER_PORT__ = process.env.SSR === 'true' ? 3010 : process.env.CLIENT_URL ? new URL(process.env.CLIENT_URL).port : 3000;
const __SERVER_PROTOCOL__ = 'http';
const __LOCAL_SERVER_HOST__ = 'localhost';
const __GRAPHQL_ENDPOINT__ = process.env.GRAPHQL_URL ? new URL(process.env.GRAPHQL_URL).pathname : '/graphql';

const config = {
    __CLIENT__: typeof window !== 'undefined',
    __SERVER__: typeof window === 'undefined',
    __DEV__: process.env.NODE_ENV !== 'production',
    __TEST__: false,
    __CDN_URL__: process.env.CDN_URL || '',
    __GRAPHQL_URL__: process.env.GRAPHQL_URL || '/graphql',
    __DEBUGGING__: false,
    __SSR__: true,
    __API_URL__: process.env.API_URL || '/graphql',
    __FRONTEND_BUILD_DIR__: process.env.FRONTEND_BUILD_DIR || './dist/client',
    __WEB_DEV_SERVER_PORT__,
    __GRAPHQL_ENDPOINT__,
    __LOCAL_SERVER_HOST__,
    __BACKEND_URL__: process.env.LOCAL_BACKEND_URL || `${__SERVER_PROTOCOL__}://${__LOCAL_SERVER_HOST__}:${__WEB_SERVER_PORT__}`,
};

console.log('---CONFIG', config);
export default config;
