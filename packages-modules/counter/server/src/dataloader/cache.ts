import DataLoader from 'dataloader';
import { KeyValueCache } from '@apollo/utils.keyvaluecache';
import { logger } from '@cdm-logger/server';
import { config } from '../config';
import { ICounterService } from '../interfaces';
import { Counter } from '../generated-models';

const KEY = 'COUNTER';
export const setupCaching = ({
    counterService,
    cache,
}: {
    counterService: ICounterService;
    cache: KeyValueCache<string>;
}) => {
    const loader = new DataLoader<string, Counter>(
        (args) => (counterService.counterQuery() as Promise<Counter>).then((data) => [data]),
        { batch: false },
    );
    const cachedCounterService: ICounterService = {} as ICounterService;
    cachedCounterService.counterQuery = async () => {
        // stores as file:///tmp/tmp.txt
        const key = KEY;
        const cacheDoc = await cache.get(key);

        if (cacheDoc) {
            logger.trace('  document pulled from cache, [%s]', JSON.stringify(cacheDoc));
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return JSON.parse(cacheDoc);
        }
        try {
            const doc = await loader.load(KEY);

            // https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-caching#apollo-server-caching
            await cache.set(key, JSON.stringify(doc), { ttl: config.FILES_TTL });
            return doc;
        } catch (e) {
            console.log('error: ', e);
            return null;
        }
    };
    // it does syncing of counter
    cachedCounterService.addCounter = async () => {
        cache.delete(KEY);
        const newCounter = await loader.load(KEY);
        await cache.set(KEY, JSON.stringify(newCounter), { ttl: config.FILES_TTL });
    };

    return cachedCounterService;
};
