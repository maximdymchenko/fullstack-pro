/// <reference path='../../../../typings/index.d.ts' />
import { str, bool, num, json, cleanEnv } from 'envalid';

export const config = cleanEnv(process.env, {
    NODE_ENV: str({ default: 'production', choices: ['production', 'staging', 'development', 'test'] }),
    NATS_URL: str({ devDefault: 'nats://localhost:4222/' }),
    NATS_USER: str({ devDefault: 'test' }),
    NATS_PW: str({ devDefault: 'test' }),
    MONGO_URL: str({ devDefault: 'mongodb://localhost:27017/sample-stack' }),
    MONGO_OPTIONS: str({ default: '{}' }),
    LOG_LEVEL: str({ default: 'info', devDefault: 'trace', choices: ['info', 'debug', 'trace'] }),
    REDIS_CLUSTER_URL: json({
        devDefault: '[{"port":6379,"host":"localhost"}]',
        example: '[{"port":6379,"host":"localhost"}]',
    }),
    REDIS_URL: str({ devDefault: 'localhost' }),
    REDIS_CLUSTER_ENABLED: bool({ devDefault: false }),
    REDIS_SENTINEL_ENABLED: bool({ devDefault: true }),
    HEMERA_LOG_LEVEL: str({
        default: 'info',
        devDefault: 'info',
        choices: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    }),
    BACKEND_URL: str({ devDefault: __BACKEND_URL__ }),
    GRAPHQL_URL: str({ devDefault: __GRAPHQL_URL__ }),
    CLIENT_URL: str({ devDefault: __BACKEND_URL__ }),
    CONNECTION_ID: str({ devDefault: 'CONNECTION_ID' }),
    MAILGUN_KEY: str(),
    MAILGUN_DOMAIN: str(),
    NAMESPACE: str({ default: 'default' }),
    ACTIVITY_NAMESPACE: str({ devDefault: 'default' }),
    API_NAMESPACE: str({ devDefault: 'default' }),
    ADMIN_API_NAMESPACE: str({ devDefault: 'default' }),
});
