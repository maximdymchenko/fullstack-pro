import { ApolloServer, ApolloServerExpressConfig } from 'apollo-server-express';
import { ApolloServerPluginCacheControl, ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import 'isomorphic-fetch';
import { Express } from 'express';
import * as http from 'http';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { RedisCache, RedisClusterCache } from 'apollo-server-cache-redis';
import { CdmLogger } from '@cdm-logger/core';
import { WebSocketServer } from 'ws';
import { IModuleService } from '../interfaces';
import { GraphqlWs } from './graphql-ws';
import { config } from '../config/env-config';

type ILogger = CdmLogger.ILogger;

let debug = false;
if ((process.env.LOG_LEVEL && process.env.LOG_LEVEL === 'trace') || process.env.LOG_LEVEL === 'debug') {
    debug = true;
}

// @workaround as the `dataSources` not available in Subscription (websocket) Context.
// https://github.com/apollographql/apollo-server/issues/1526 need to revisit in Apollo-Server v3.
const constructDataSourcesForSubscriptions = (context, cache, dataSources) => {
    const intializeDataSource = (instance) => {
        instance.initialize({ context, cache });
    };
    // tslint:disable-next-line:forin
    // eslint-disable-next-line guard-for-in
    for (const prop in dataSources) {
        // tslint:disable-next-line:no-console
        intializeDataSource(dataSources[prop]);
    }
    return dataSources;
};

let wsServerCleanup: any;
export class GraphqlServer {
    private logger: ILogger;

    // private wsServerCleanup: any;
    constructor(
        private app: Express,
        private httpServer: http.Server,
        private cache: RedisCache | RedisClusterCache,
        private moduleService: IModuleService,
        private enableSubscription = true,
    ) {
        this.logger = this.moduleService.logger.child({ className: 'GraphqlServer' });
        if (enableSubscription) {
            const wsServer = new WebSocketServer({
                server: this.httpServer,
                path: __GRAPHQL_ENDPOINT__,
            });
            const graphqlWs = new GraphqlWs(wsServer, this.moduleService, this.cache);
            wsServerCleanup = graphqlWs.create();
            // wsServerCleanup = useServer({ schema: this.moduleService.schema}, wsServer)
        }
    }

    public async initialize() {
        this.logger.info('GraphqlServer initializing...');
        const apolloServer = this.configureApolloServer();
        await apolloServer.start();
        const corsOptions = {
            origin: [config.CLIENT_URL],
            credentials: true,
        };
        apolloServer.applyMiddleware({
            app: this.app,
            cors: corsOptions,
            path: __GRAPHQL_ENDPOINT__,
        });
        this.logger.info('GraphqlServer initialized - ', config.CLIENT_URL);
    }

    getUserIpAddress(req) {
        let ip = (req?.headers['x-forwarded-for'] || '').split(',')[0] || req?.connection?.remoteAddress;
        if (ip.substr(0, 7) === '::ffff:') {
            ip = ip.substr(7);
        }
        if (ip === '::1') {
            ip = '127.0.0.1';
        }
        return ip;
    }

    private configureApolloServer(): ApolloServer {
        const serverConfig: ApolloServerExpressConfig = {
            debug,
            schema: this.moduleService.schema,
            dataSources: () => this.moduleService.dataSource,
            cache: new KeyvAdapter(new Keyv({ store: new KeyvRedis(this.cache) }), {
                disableBatchReads: true,
            }),
            context: async ({
                req,
                res,
                connection,
            }: {
                req: Express.Request;
                res: Express.Response;
                connection: any;
            }) => {
                let context;
                let addons = {};
                try {
                    if (connection) {
                        context = connection.context;
                        if (!context.dataSources) {
                            addons = {
                                // @workaround for apollo server issue #1526
                                dataSources: constructDataSourcesForSubscriptions(
                                    connection.context,
                                    this.cache,
                                    this.moduleService.dataSource,
                                ),
                            };
                        } else {
                            addons = {
                                // @workaround for apollo server issue #1526
                                dataSources: context.dataSources,
                            };
                        }
                    } else {
                        const pureContext = await this.moduleService.createContext(req, res);
                        const contextServices = await this.moduleService.serviceContext(req, res);
                        context = {
                            ...pureContext,
                            ...contextServices,
                            preferences: this.moduleService.defaultPreferences,
                            // update: updateContainers,
                        };
                    }
                    context.userIp = this.getUserIpAddress(req);
                } catch (err) {
                    this.logger.error('adding context to graphql failed due to [%o]', err);
                    throw err;
                }
                return {
                    req,
                    res,
                    ...context,
                    ...addons,
                };
            },
            plugins: [
                // process.env.NODE_ENV === 'production'
                //     ? ApolloServerPluginLandingPageDisabled()
                //     :
                // ApolloServerPluginLandingPageGraphQLPlayground(),
                // ApolloServerPluginLandingPageDisabled(),
                ApolloServerPluginDrainHttpServer({ httpServer: this.httpServer }),
                ApolloServerPluginCacheControl(),
                responseCachePlugin({
                    sessionId: (requestContext) => requestContext?.userContext?.accountId || null,
                }),
            ],
        };
        if (this.enableSubscription) {
            serverConfig.plugins.push({
                async serverWillStart() {
                    return {
                        drainServer: async () => {
                            await wsServerCleanup.dispose();
                        },
                    };
                },
            });
        }
        return new ApolloServer(serverConfig);
    }
}