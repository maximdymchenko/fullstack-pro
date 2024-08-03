const Sentry = require('@sentry/node');

Sentry.init({ dsn: process.env.SENTRY_DSN_BACKEND });


export const sentryMiddleware = Sentry.Handlers.requestHandler();


export const sentryErrorHandlerMiddleware = Sentry.Handlers.errorHandler();
