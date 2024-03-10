import { counterReducer  } from './redux';
import { resolvers, stateDefault } from './graphql';

import { Feature } from '@common-stack/client-react';
import { filteredMenus, filteredRoutes } from './compute';

export default new Feature({
  menuConfig: filteredMenus,
  routeConfig: filteredRoutes,
  reducer: { counter: counterReducer },
  clientStateParams: { resolvers, defaults: [stateDefault] },
});
