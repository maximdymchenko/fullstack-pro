// @ts-nocheck
import * as React from 'react';

import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { PluginArea } from '@common-stack/client-react';
import { subscribeReduxRouter } from '@common-stack/remix-router-redux';

// import { ApplicationErrorHandler } from '@admin-layout/chakra-ui';
// @ts-ignore
import clientModules, { plugins } from '@app/frontend-stack-react/modules.js';
import { createHead } from 'remix-island';
import { useContext } from 'react';
import { ServerStyleContext, ClientStyleContext } from './context';
import { withEmotionCache } from '@emotion/react';
import { useChangeLanguage } from 'remix-i18next/react';
import { i18nextInstance as i18next } from '@app/frontend-stack-react/i18n-localization/i18next.server.js';
import { ErrorBoundary } from '@app/frontend-stack-react/entries/chakraui/components/ErrorBoundary.js';

interface DocumentProps {
    children: React.ReactNode;
}

export const Head = createHead(() => (
    <>
        <Meta />
        <Links />
    </>
));

export const Document = withEmotionCache(({ children }: DocumentProps, emotionCache) => {
    const serverStyleData = useContext(ServerStyleContext);
    const clientStyleData = useContext(ClientStyleContext);

    React.useEffect(() => {
        // re-link sheet container
        emotionCache.sheet.container = document.head;
        // re-inject tags
        const tags = emotionCache.sheet.tags;
        emotionCache.sheet.flush();
        tags.forEach((tag) => {
            (emotionCache.sheet as any)._insertTag(tag);
        });
        // reset cache to reapply global styles
        clientStyleData?.reset();
    }, []);

    return (
        <>
            <Head />
            {serverStyleData?.map(({ key, ids, css }) => (
                <style key={key} data-emotion={`${key} ${ids.join(' ')}`} dangerouslySetInnerHTML={{ __html: css }} />
            ))}
            <script
                src="https://cdnjs.cloudflare.com/ajax/libs/reflect-metadata/0.1.13/Reflect.min.js"
                integrity="sha512-jvbPH2TH5BSZumEfOJZn9IV+5bSwwN+qG4dvthYe3KCGC3/9HmxZ4phADbt9Pfcp+XSyyfc2vGZ/RMsSUZ9tbQ=="
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
            ></script>
            <PluginArea />
            {children}
            <ScrollRestoration />
            <Scripts />
        </>
    );
});

export let loader = async ({ request }) => {
    let locale = await i18next.getLocale(request);
    return json({ locale });
};

export let handle = {
    i18n: 'common',
};

export function shouldRevalidate(params: any) {
    return params.defaultShouldRevalidate && params.currentUrl.pathname !== params.nextUrl.pathname;
}

export default function App() {
    let { locale } = useLoaderData();

    useChangeLanguage(locale);

    React.useEffect(() => {
        subscribeReduxRouter({ store: window.__remixStore, router: window.__remixRouter } as any);
    }, []);

    return (
        // <ApplicationErrorHandler plugins={plugins}>
            <Document>{clientModules.getWrappedRoot(<Outlet />)}</Document>
        // </ApplicationErrorHandler>
    );
}

export { ErrorBoundary };
