import React, { useState, startTransition, StrictMode } from 'react';
import 'reflect-metadata';
import { RemixBrowser } from '@remix-run/react';
import { hydrateRoot } from 'react-dom/client';
import { ApolloProvider } from '@apollo/client/index.js';
import { SlotFillProvider, removeUniversalPortals } from '@common-stack/components-pro';
import { InversifyProvider, PluginArea } from '@common-stack/client-react';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { persistStore } from 'redux-persist';
import { CacheProvider } from '@emotion/react';

// @ts-ignore
import createEmotionCache, { defaultCache } from '@app/frontend-stack-react/entries/common/createEmotionCache';
// @ts-ignore
import { createReduxStore } from '@app/frontend-stack-react/config/redux-config.js';
// @ts-ignore
import { createClientContainer } from '@app/frontend-stack-react/config/client.service';
// @ts-ignore
import clientModules from '@app/frontend-stack-react/modules.js';

import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
// @ts-ignore
import { getInitialNamespaces } from 'remix-i18next/client';
import config from '@app/cde-webconfig.json';
// @ts-ignore
import { ClientStyleContext } from '@app/frontend-stack-react/entries/chakraui/context.js';

const { apolloClient: client, container, serviceFunc } = createClientContainer();
const { store } = createReduxStore(client, serviceFunc(), container);
const persistor = persistStore(store);

(window as any).__remixStore = store;
removeUniversalPortals((window as any).__SLOT_FILLS__ || []);

interface ClientCacheProviderProps {
    children: React.ReactNode;
}

function ClientCacheProvider({ children }: ClientCacheProviderProps) {
    const [cache, setCache] = useState(defaultCache);

    function reset() {
        setCache(createEmotionCache());
    }

    return (
        <ClientStyleContext.Provider value={{ reset }}>
            <CacheProvider value={cache}>{children}</CacheProvider>
        </ClientStyleContext.Provider>
    );
}

async function hydrate() {
    if (!i18next.isInitialized && config.i18n.enabled) {
        await i18next
            .use(initReactI18next)
            .use(LanguageDetector)
            .use(Backend)
            .init({
                fallbackLng: config.i18n.fallbackLng,
                defaultNS: config.i18n.defaultNS,
                react: config.i18n.react,
                supportedLngs: config.i18n.supportedLngs,
                backend: config.i18n.backend,
                ns: getInitialNamespaces(),
                detection: {
                    order: ['htmlTag'],
                    caches: [],
                },
            });
    }
    hydrateRoot(
        document.getElementById('root')!,
        <StrictMode>
            <I18nextProvider i18n={i18next}>
                <ClientCacheProvider>
                    <ApolloProvider client={client}>
                        <ReduxProvider store={store}>
                            <SlotFillProvider>
                                <InversifyProvider container={container} modules={clientModules}>
                                    <PersistGate loading={null} persistor={persistor}>
                                        {() => <RemixBrowser />}
                                    </PersistGate>
                                </InversifyProvider>
                            </SlotFillProvider>
                        </ReduxProvider>
                    </ApolloProvider>
                </ClientCacheProvider>
            </I18nextProvider>
        </StrictMode>,
    );
    // });
}

if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(hydrate);
} else {
    // Safari doesn't support requestIdleCallback
    // https://caniuse.com/requestidlecallback
    setTimeout(hydrate, 1);
}
