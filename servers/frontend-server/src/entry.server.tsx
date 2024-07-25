/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */
// @ts-nocheck
global.__CLIENT__ = false;
global.__SERVER__ = true;
import React from 'react';
import { PassThrough, Transform } from 'node:stream';
import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { createReadableStreamFromReadable } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { ApolloProvider } from '@apollo/client/index.js';
import { SlotFillProvider } from '@common-stack/components-pro';
import { InversifyProvider, PluginArea } from '@common-stack/client-react';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import { Provider as ReduxProvider } from 'react-redux';
import { LOCATION_CHANGE } from '@common-stack/remix-router-redux';
import serialize from 'serialize-javascript';
import { CacheProvider } from '@emotion/react';
import createEmotionServer from '@emotion/server/create-instance';
import Backend from 'i18next-fs-backend';
import { renderToString } from 'react-dom/server';
import { renderHeadToString } from 'remix-island';
import publicEnv from '@src/config/public-config';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { createInstance } from 'i18next';
import { resolve } from 'node:path';
// import { renderStylesToNodeStream } from '@emotion/server';
// @ts-ignore
import { defaultCache } from '@app/frontend-stack-react/entries/common/createEmotionCache.js';
// @ts-ignore
import config from '@app/cde-webconfig.json';

import { Head } from './root';
import type { IAppLoadContext } from '@common-stack/client-core';
import { ServerStyleContext } from '@app/frontend-stack-react/entries/chakraui/context.js';
import { i18nextInstance as i18next } from '@app/frontend-stack-react/i18n-localization/i18next.server.js';
const { extractCriticalToChunks } = createEmotionServer(defaultCache);

const ABORT_DELAY = 5000;
const COMMON_HEAD = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
`;

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
    // This is ignored so we can keep it in the template for visibility.  Feel
    // free to delete this parameter in your app if you're not using it!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loadContext: AppLoadContext,
) {
    return isbot(request.headers.get('user-agent') || '')
        ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext)
        : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext);
}

function handleBotRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
    loadContext: IAppLoadContext,
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false;
        const { pipe, abort } = renderToPipeableStream(
            <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
            {
                onAllReady() {
                    shellRendered = true;

                    const head = renderHeadToString({ request, remixContext, Head });
                    const body = new PassThrough();

                    responseHeaders.set('Content-Type', 'text/html');
                    const stream = createReadableStreamFromReadable(body);
                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    );
                    body.write(`<!DOCTYPE html><html><head>${COMMON_HEAD}${head}</head><body><div id="root">`);
                    pipe(body);
                    body.write(`</div></body></html>`);
                },
                onShellError(error: unknown) {
                    reject(error);
                },
                onError(error: unknown) {
                    responseStatusCode = 500;
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error);
                    }
                },
            },
        );

        setTimeout(abort, ABORT_DELAY);
    });
}

async function handleBrowserRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    remixContext: EntryContext,
    loadContext: IAppLoadContext,
) {
    const instance = createInstance();

    // Then we could detect locale from the request
    const lng = await i18next.getLocale(request);
    // And here we detect what namespaces the routes about to render want to use
    const ns = i18next.getRouteNamespaces(remixContext);
    const slotFillContext = { fills: {} };
    const { modules: clientModules, container, apolloClient: client, store }: IAppLoadContext = loadContext;

    // First, we create a new instance of i18next so every request will have a
    // completely unique instance and not share any state.
    if (config.i18n.enabled) {
        await instance
            .use(initReactI18next) // Tell our instance to use react-i18next
            .use(Backend) // Setup our backend.init({
            .init({
                fallbackLng: config.i18n.fallbackLng,
                defaultNS: config.i18n.defaultNS,
                react: config.i18n.react,
                supportedLngs: config.i18n.supportedLngs,
                lng, // The locale we detected above
                ns, // The namespaces the routes about to render want to use
                backend: {
                    loadPath: resolve(config.i18n.backend.loadServerPath),
                },
            });
    }

    const html = renderToString(
        <I18nextProvider i18n={instance}>
            <CacheProvider value={defaultCache}>
                <ApolloProvider client={client}>
                    <ReduxProvider store={store}>
                        <SlotFillProvider context={slotFillContext}>
                            <InversifyProvider container={container} modules={clientModules}>
                                <RemixServer context={remixContext} url={request.url} />
                            </InversifyProvider>
                        </SlotFillProvider>
                    </ReduxProvider>
                </ApolloProvider>
            </CacheProvider>
        </I18nextProvider>,
    );

    const chunks = extractCriticalToChunks(html);

    return new Promise((resolve, reject) => {
        let shellRendered = false;

        const { pathname, search, hash } = new URL(request.url);
        store.dispatch({
            type: LOCATION_CHANGE,
            payload: { location: { pathname, search, hash }, action: 'POP' },
        });

        const { pipe, abort } = renderToPipeableStream(
            (
                <I18nextProvider i18n={instance}>
                    <ServerStyleContext.Provider value={chunks.styles}>
                        <CacheProvider value={defaultCache}>
                            <ApolloProvider client={client}>
                                <ReduxProvider store={store}>
                                    <SlotFillProvider context={slotFillContext}>
                                        <InversifyProvider container={container} modules={clientModules}>
                                            <RemixServer
                                                context={remixContext}
                                                url={request.url}
                                                abortDelay={ABORT_DELAY}
                                            />
                                        </InversifyProvider>
                                    </SlotFillProvider>
                                </ReduxProvider>
                            </ApolloProvider>
                        </CacheProvider>
                    </ServerStyleContext.Provider>
                </I18nextProvider>
            ) as any,
            {
                onShellReady() {
                    shellRendered = true;
                    const head = renderHeadToString({ request, remixContext, Head });
                    const body = new PassThrough();
                    const stream = createReadableStreamFromReadable(body);
                    const apolloState = { ...client.extract() };
                    const reduxState = { ...store.getState() };
                    const fills = Object.keys(slotFillContext.fills);
                    // const transform = new ConstantsTransform(fills, apolloState, reduxState);

                    let customHead = `<script>window.__ENV__=${JSON.stringify(publicEnv)}</script>`;
                    customHead += `<script>window.__APOLLO_STATE__=${serialize(apolloState, {
                        isJSON: true,
                    })}</script>`;
                    customHead += `<script>window.__PRELOADED_STATE__=${serialize(reduxState, {
                        isJSON: true,
                    })}</script>`;
                    customHead += `<script>window.__SLOT_FILLS__=${serialize(fills, { isJSON: true })}</script>`;
                    customHead += `<script>if (global === undefined) { var global = window; }</script>`;

                    responseHeaders.set('Content-Type', 'text/html');

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    );
                    body.write(
                        `<!DOCTYPE html><html lng=${lng}><head>${COMMON_HEAD}${customHead}${head}</head><body><div id="root">`,
                    );
                    pipe(body);
                    body.write(`</div></body></html>`);
                    // pipe(transform).pipe(renderStylesToNodeStream()).pipe(body);
                },
                onShellError(error: unknown) {
                    reject(error);
                },
                onError(error: unknown) {
                    responseStatusCode = 500;
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error);
                    }
                    reject(error);
                },
            },
        );

        setTimeout(abort, ABORT_DELAY);
    });
}
