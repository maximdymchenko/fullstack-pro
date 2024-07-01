/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */
import 'reflect-metadata';
import './config/public-config';
import { RemixBrowser } from '@remix-run/react';
import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { createCache, StyleProvider } from '@ant-design/cssinjs';
import { ApolloProvider } from '@apollo/client/index.js';
import { SlotFillProvider, removeUniversalPortals } from '@common-stack/components-pro';
import { InversifyProvider, PluginArea } from '@common-stack/client-react';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';
import { CacheProvider } from '@emotion/react';
import { createReduxStore } from '../app/frontend-stack-react/config/redux-config.js';
import { createClientContainer } from '../app/frontend-stack-react/config/client.service';
// @ts-ignore
import clientModules from 'virtual:module';
import createEmotionCache from './common/createEmotionCache';
// 
import i18n from "../i18n-configuration/i18n";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { getInitialNamespaces } from "remix-i18next/client";

const { apolloClient: client, container, serviceFunc } = createClientContainer();
const { store } = createReduxStore(client, serviceFunc(), container);
const persistor = persistStore(store);
const antCache = createCache();
const cache = createEmotionCache();

window.__remixStore = store;
removeUniversalPortals(window.__SLOT_FILLS__ || []);

// clientModules.hydrate(container, window.__APOLLO_STATE__);

async function hydrate() {
    await i18next
        .use(initReactI18next) // Tell i18next to use the react-i18next plugin
        .use(LanguageDetector) // Setup a client-side language detector
        .use(Backend) // Setup your backend
        .init({
            ...i18n, // spread the configuration
            // This function detects the namespaces your routes rendered while SSR use
            ns: getInitialNamespaces(),
            backend: { loadPath: "/cdm-locales/{{lng}}/{{ns}}.json" },
            detection: {
                // Here only enable htmlTag detection, we'll detect the language only
                // server-side with remix-i18next, by using the `<html lang>` attribute
                // we can communicate to the client the language detected server-side
                order: ["htmlTag"],
                // Because we only use htmlTag, there's no reason to cache the language
                // on the browser, so we disable it
                caches: [],
            },
        });


    startTransition(() => {
        hydrateRoot(
            document,
            (
                <I18nextProvider i18n={i18next}>
                    <StrictMode>
                        <CacheProvider value={cache}>
                            <StyleProvider cache={antCache}>
                                <ReduxProvider store={store}>
                                    <SlotFillProvider>
                                        <InversifyProvider container={container} modules={clientModules}>
                                            <PersistGate loading={null} persistor={persistor}>
                                                {() => (
                                                    <ApolloProvider client={client}>
                                                        <RemixBrowser />
                                                    </ApolloProvider>
                                                )}
                                            </PersistGate>
                                        </InversifyProvider>
                                    </SlotFillProvider>
                                </ReduxProvider>
                            </StyleProvider>
                        </CacheProvider>
                    </StrictMode>
                </I18nextProvider>
            ) as any,
        );
    });
}

if (window.requestIdleCallback) {
    window.requestIdleCallback(hydrate);
} else {
    // Safari doesn't support requestIdleCallback
    // https://caniuse.com/requestidlecallback
    window.setTimeout(hydrate, 1);
}