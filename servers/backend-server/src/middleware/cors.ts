/* eslint-disable jest/require-hook */
import * as cors from 'cors';
import { logger } from '@cdm-logger/server';
import { config } from '../config';

const CLIENT_URL = config.CLIENT_URL;
const BACKEND_URL = config.BACKEND_URL;

const corsWhitelist = [
    BACKEND_URL,
    CLIENT_URL,
    config.GRAPHQL_URL,
    // 'http://localhost:3000',
];
logger.info('Cors whitelist: %j', corsWhitelist);
const corsOptions = {
    origin: (origin, callback) => {
        if (corsWhitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // TODO: only throw when in debug mode
            logger.error('url (%s) is not in the whitelist', origin);
            // callback(new Error('Not allowed by CORS'))
            logger.warn('allowing all origins temporarily, you need to disable it.');
            callback(null, true);
        }
    },
    credentials: true,
};

export const corsMiddleware = cors(corsOptions);
