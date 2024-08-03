/* eslint-disable @typescript-eslint/no-var-requires */
import * as express from 'express';
import * as bodyParser from 'body-parser';
import modules from './modules';
import { errorMiddleware } from './middleware/error';
import { contextServicesMiddleware } from './middleware/services';
import { sentryMiddleware, sentryErrorHandlerMiddleware } from './middleware/sentry';
import { IModuleService } from './interfaces';
import { corsMiddleware } from './middleware/cors';

const cookiesMiddleware = require('universal-cookie-express');

export function expressApp(options: IModuleService, middlewares, http?) {
    const app: express.Express = express();

    
    for (const applyBeforeware of modules.beforewares) {
        applyBeforeware(app);
    }
    app.use(cookiesMiddleware());
    app.use(contextServicesMiddleware(options.createContext, options.serviceContext));

    // Don't rate limit heroku
    app.enable('trust proxy');

    app.use(sentryMiddleware);

    if (middlewares !== null) {
        app.use(middlewares);
    }

    app.use('/', express.static(__FRONTEND_BUILD_DIR__, { maxAge: '180 days' }));

    app.use(corsMiddleware);
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Credentials', JSON.stringify(true));
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header(
            'Access-Control-Allow-Headers',
            'X-Requested-With, X-HTTP-Method-Override, X-CSP-Nonce, Content-Type, Accept',
        );
        next();
    });

    app.use(
        bodyParser.json({
            limit: '50mb',
            verify: (req, res, buf) => {
                // #Todo: Find some proper solution for it
                (req as any).rawBody = buf;
            },
        }),
    );
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

    for (const applyMiddleware of modules.middlewares) {
        applyMiddleware(app);
    }

    if (__DEV__) {
        app.use(errorMiddleware);
    }

    app.use(sentryErrorHandlerMiddleware);

    return app;
}
